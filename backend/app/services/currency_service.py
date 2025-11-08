import redis.asyncio as redis
import json
import requests
from datetime import datetime
from decimal import Decimal
from typing import Optional
from app.core.config import settings
from app.core.exceptions import StockDataException
from app.models.transaction import Currency


class CurrencyService:
    """Service for fetching currency exchange rates."""

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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

    async def get_exchange_rate(self, from_currency: Currency, to_currency: Currency) -> Decimal:
        """
        Get exchange rate between two currencies.

        Args:
            from_currency: Source currency
            to_currency: Target currency

        Returns:
            Exchange rate as Decimal

        Raises:
            StockDataException: If unable to fetch exchange rate
        """
        # If same currency, rate is 1
        if from_currency == to_currency:
            return Decimal("1.0")

        await self.init_redis()

        # Check cache first
        cache_key = f"exchange_rate:{from_currency.value}:{to_currency.value}"
        if self.redis_client:
            cached_rate = await self.redis_client.get(cache_key)
            if cached_rate:
                return Decimal(cached_rate)

        # Fetch from Yahoo Finance
        try:
            # For USD to CAD, use USDCAD=X ticker
            # For CAD to USD, use CADUSD=X ticker
            if from_currency == Currency.USD and to_currency == Currency.CAD:
                symbol = "USDCAD=X"
            elif from_currency == Currency.CAD and to_currency == Currency.USD:
                symbol = "CADUSD=X"
            else:
                raise StockDataException(f"Unsupported currency pair: {from_currency} to {to_currency}")

            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
            params = {
                "interval": "1d",
                "range": "1d"
            }

            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            # Extract exchange rate
            if not data.get("chart") or not data["chart"].get("result"):
                raise StockDataException(f"No exchange rate data available for {symbol}")

            result = data["chart"]["result"][0]
            meta = result.get("meta", {})

            # Get the current price (exchange rate)
            regular_market_price = meta.get("regularMarketPrice")
            if regular_market_price is None:
                raise StockDataException(f"No exchange rate available for {symbol}")

            exchange_rate = Decimal(str(regular_market_price))

            # Cache the result for 1 hour
            if self.redis_client:
                await self.redis_client.setex(
                    cache_key,
                    3600,  # 1 hour cache
                    str(exchange_rate),
                )

            return exchange_rate

        except Exception as e:
            raise StockDataException(f"Failed to fetch exchange rate for {from_currency} to {to_currency}: {str(e)}")

    async def convert_amount(
        self,
        amount: Decimal,
        from_currency: Currency,
        to_currency: Currency
    ) -> Decimal:
        """
        Convert an amount from one currency to another.

        Args:
            amount: Amount to convert
            from_currency: Source currency
            to_currency: Target currency

        Returns:
            Converted amount
        """
        if from_currency == to_currency:
            return amount

        exchange_rate = await self.get_exchange_rate(from_currency, to_currency)
        return amount * exchange_rate


# Singleton instance
currency_service = CurrencyService()
