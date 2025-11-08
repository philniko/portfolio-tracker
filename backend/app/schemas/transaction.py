from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from app.models.transaction import TransactionType, Currency


class TransactionBase(BaseModel):
    """Base transaction schema."""

    symbol: str = Field(..., min_length=1, max_length=10, description="Stock ticker symbol")
    transaction_type: TransactionType = Field(..., description="Type of transaction (BUY, SELL, DIVIDEND)")
    quantity: Decimal = Field(..., gt=0, description="Number of shares")
    price: Decimal = Field(..., gt=0, description="Price per share")
    currency: Currency = Field(
        default=Currency.CAD,
        description="Currency of the transaction (CAD or USD, auto-detected from stock data)"
    )
    fees: Decimal = Field(default=Decimal("0"), ge=0, description="Transaction fees")
    transaction_date: datetime = Field(..., description="Date and time of the transaction")
    notes: str | None = Field(None, description="Optional notes")


class TransactionCreate(TransactionBase):
    """Schema for creating a transaction."""

    portfolio_id: int


class TransactionUpdate(BaseModel):
    """Schema for updating a transaction."""

    symbol: str | None = Field(None, min_length=1, max_length=10)
    transaction_type: TransactionType | None = None
    quantity: Decimal | None = Field(None, gt=0)
    price: Decimal | None = Field(None, gt=0)
    currency: Currency | None = None
    fees: Decimal | None = Field(None, ge=0)
    transaction_date: datetime | None = None
    notes: str | None = None


class TransactionResponse(TransactionBase):
    """Schema for transaction response."""

    id: int
    portfolio_id: int
    total_amount: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


class StockPriceResponse(BaseModel):
    """Schema for stock price data."""

    symbol: str = Field(..., description="Stock ticker symbol")
    current_price: Decimal = Field(..., description="Current market price")
    previous_close: Decimal | None = Field(None, description="Previous closing price")
    open_price: Decimal | None = Field(None, description="Opening price")
    day_high: Decimal | None = Field(None, description="Day high price")
    day_low: Decimal | None = Field(None, description="Day low price")
    volume: int | None = Field(None, description="Trading volume")
    market_cap: Decimal | None = Field(None, description="Market capitalization")
    change: Decimal | None = Field(None, description="Price change")
    change_percent: Decimal | None = Field(None, description="Price change percentage")
    currency: Currency = Field(..., description="Stock currency (CAD or USD, auto-detected)")
    timestamp: datetime = Field(..., description="Timestamp of the price data")
