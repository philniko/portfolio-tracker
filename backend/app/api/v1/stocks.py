from fastapi import APIRouter, Depends
from typing import List
from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.transaction import StockPriceResponse
from app.services.stock_service import stock_service

router = APIRouter()


@router.get("/{symbol}", response_model=StockPriceResponse)
async def get_stock_price(
    symbol: str,
    # TODO: This causes issue (not authenticated) even when logged in
    # current_user: User = Depends(get_current_active_user),
):
    """
    Get current price for a stock symbol.

    Args:
        symbol: Stock ticker symbol
        current_user: Current authenticated user

    Returns:
        Stock price data including current price, change, volume, etc.
    """
    return await stock_service.get_stock_price(symbol)


@router.post("/batch", response_model=List[StockPriceResponse])
async def get_multiple_stock_prices(
    symbols: List[str],
    current_user: User = Depends(get_current_active_user),
):
    """
    Get current prices for multiple stock symbols.

    Args:
        symbols: List of stock ticker symbols
        current_user: Current authenticated user

    Returns:
        List of stock price data
    """
    prices = await stock_service.get_multiple_stock_prices(symbols)
    return list(prices.values())
