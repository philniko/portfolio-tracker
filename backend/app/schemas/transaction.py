from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from app.models.transaction import TransactionType


class TransactionBase(BaseModel):
    """Base transaction schema."""

    symbol: str = Field(..., min_length=1, max_length=10)
    transaction_type: TransactionType
    quantity: Decimal = Field(..., gt=0)
    price: Decimal = Field(..., gt=0)
    fees: Decimal = Field(default=Decimal("0"), ge=0)
    transaction_date: datetime
    notes: str | None = None


class TransactionCreate(TransactionBase):
    """Schema for creating a transaction."""

    portfolio_id: int


class TransactionUpdate(BaseModel):
    """Schema for updating a transaction."""

    symbol: str | None = Field(None, min_length=1, max_length=10)
    transaction_type: TransactionType | None = None
    quantity: Decimal | None = Field(None, gt=0)
    price: Decimal | None = Field(None, gt=0)
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

    symbol: str
    current_price: Decimal
    previous_close: Decimal | None = None
    open_price: Decimal | None = None
    day_high: Decimal | None = None
    day_low: Decimal | None = None
    volume: int | None = None
    market_cap: Decimal | None = None
    change: Decimal | None = None
    change_percent: Decimal | None = None
    timestamp: datetime
