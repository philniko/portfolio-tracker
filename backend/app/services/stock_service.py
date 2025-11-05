import yfinance as yf
from datetime import datetime
from decimal import Decimal
from typing import Dict, Optional
import redis.asyncio as redis
import json
from app.core.config import settings
from app.core.exceptions import StockDataException
from app.schemas.transaction import StockPriceResponse


class StockService:
    """Service for fetching real-time stock data."""

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None

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

        # Fetch from yfinance
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period="1d")

            if hist.empty or "currentPrice" not in info:
                raise StockDataException(f"No data available for symbol: {symbol}")

            current_price = Decimal(str(info.get("currentPrice", hist["Close"].iloc[-1])))
            previous_close = Decimal(str(info.get("previousClose", 0)))
            change = current_price - previous_close if previous_close else None
            change_percent = (
                (change / previous_close * 100) if change and previous_close else None
            )

            stock_data = StockPriceResponse(
                symbol=symbol.upper(),
                current_price=current_price,
                previous_close=previous_close or None,
                open_price=Decimal(str(info.get("open", 0))) or None,
                day_high=Decimal(str(info.get("dayHigh", 0))) or None,
                day_low=Decimal(str(info.get("dayLow", 0))) or None,
                volume=info.get("volume"),
                market_cap=Decimal(str(info.get("marketCap", 0))) if info.get("marketCap") else None,
                change=change,
                change_percent=change_percent,
                timestamp=datetime.utcnow(),
            )

            # Cache the result
            if self.redis_client:
                await self.redis_client.setex(
                    cache_key,
                    settings.STOCK_CACHE_EXPIRE_SECONDS,
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
