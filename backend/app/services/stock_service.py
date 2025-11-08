import yfinance as yf
from datetime import datetime
from decimal import Decimal
from typing import Dict, Optional
import redis.asyncio as redis
import json
import requests
from app.core.config import settings
from app.core.exceptions import StockDataException
from app.schemas.transaction import StockPriceResponse
from app.models.transaction import Currency


class StockService:
    """Service for fetching real-time stock data."""

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        # Create session with custom headers to avoid Yahoo Finance blocking
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })

    async def init_redis(self):
        """Initialize Redis connection."""
        if not self.redis_client:
            self.redis_client = await redis.from_url(
                settings.REDIS_URL, encoding="utf-8", decode_responses=True
            )

    async def close_redis(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()

    async def get_stock_price(self, symbol: str) -> StockPriceResponse:
        """
        Get current stock price with caching.

        Args:
            symbol: Stock ticker symbol

        Returns:
            StockPriceResponse with current price data

        Raises:
            StockDataException: If unable to fetch stock data
        """
        await self.init_redis()

        # Check cache first
        cache_key = f"stock:{symbol.upper()}"
        if self.redis_client:
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                data = json.loads(cached_data)
                return StockPriceResponse(**data)

        # Fetch directly from Yahoo Finance API - more reliable than yfinance
        try:
            # Use Yahoo Finance v8 API directly
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol.upper()}"
            params = {
                "interval": "1d",
                "range": "5d"
            }

            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            # Extract data from response
            if not data.get("chart") or not data["chart"].get("result"):
                raise StockDataException(f"No data available for symbol: {symbol}")

            result = data["chart"]["result"][0]
            meta = result.get("meta", {})
            quotes = result.get("indicators", {}).get("quote", [{}])[0]
            timestamps = result.get("timestamp", [])

            if not timestamps or not quotes.get("close"):
                raise StockDataException(f"No price data available for symbol: {symbol}")

            # Get most recent data (last element)
            current_price = Decimal(str(quotes["close"][-1]))
            previous_close = Decimal(str(meta.get("chartPreviousClose", quotes["close"][-2] if len(quotes["close"]) > 1 else quotes["close"][-1])))

            # Calculate change
            change = current_price - previous_close
            change_percent = (change / previous_close * 100) if previous_close else None

            # Get other data
            open_price = Decimal(str(quotes["open"][-1])) if quotes.get("open") and quotes["open"][-1] is not None else None
            day_high = Decimal(str(quotes["high"][-1])) if quotes.get("high") and quotes["high"][-1] is not None else None
            day_low = Decimal(str(quotes["low"][-1])) if quotes.get("low") and quotes["low"][-1] is not None else None
            volume = int(quotes["volume"][-1]) if quotes.get("volume") and quotes["volume"][-1] is not None else None

            # Detect currency from Yahoo Finance metadata
            currency_str = meta.get("currency", "CAD").upper()
            # Map common currency codes to our Currency enum
            if currency_str in ["USD", "US$", "DOLLARS"]:
                currency = Currency.USD
            else:
                currency = Currency.CAD  # Default to CAD

            stock_data = StockPriceResponse(
                symbol=symbol.upper(),
                current_price=current_price,
                previous_close=previous_close,
                open_price=open_price,
                day_high=day_high,
                day_low=day_low,
                volume=volume,
                market_cap=meta.get("marketCap"),
                change=change,
                change_percent=change_percent,
                currency=currency,
                timestamp=datetime.utcnow(),
            )

            # Cache the result for longer to reduce API calls
            if self.redis_client:
                await self.redis_client.setex(
                    cache_key,
                    300,  # 5 minutes cache
                    json.dumps(stock_data.model_dump(), default=str),
                )

            return stock_data

        except Exception as e:
            raise StockDataException(f"Failed to fetch data for {symbol}: {str(e)}")

    async def get_multiple_stock_prices(
        self, symbols: list[str]
    ) -> Dict[str, StockPriceResponse]:
        """
        Get prices for multiple stocks.

        Args:
            symbols: List of stock ticker symbols

        Returns:
            Dictionary mapping symbols to their price data
        """
        results = {}
        for symbol in symbols:
            try:
                results[symbol.upper()] = await self.get_stock_price(symbol)
            except StockDataException:
                # Skip symbols that fail
                continue
        return results


# Singleton instance
stock_service = StockService()
