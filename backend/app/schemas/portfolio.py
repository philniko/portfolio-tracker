from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from typing import List


class PortfolioBase(BaseModel):
    """Base portfolio schema."""

    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None


class PortfolioCreate(PortfolioBase):
    """Schema for creating a portfolio."""

    pass


class PortfolioUpdate(BaseModel):
    """Schema for updating a portfolio."""

    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None


class HoldingResponse(BaseModel):
    """Schema for holding response."""

    id: int
    symbol: str
    quantity: Decimal
    average_cost: Decimal
    total_cost: Decimal
    current_price: Decimal | None = None  # Fetched in real-time
    current_value: Decimal | None = None  # quantity * current_price
    unrealized_gain_loss: Decimal | None = None  # current_value - total_cost
    unrealized_gain_loss_percent: Decimal | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class PortfolioResponse(PortfolioBase):
    """Schema for portfolio response."""

    id: int
    user_id: int
    questrade_account_id: str | None = None
    last_questrade_sync: datetime | None = None
    created_at: datetime
    updated_at: datetime | None
    holdings: List[HoldingResponse] = []
    total_value: Decimal | None = None
    total_cost: Decimal | None = None
    total_gain_loss: Decimal | None = None
    total_gain_loss_percent: Decimal | None = None

    model_config = {"from_attributes": True}


class PortfolioSummary(BaseModel):
    """Schema for portfolio summary (lightweight)."""

    id: int
    name: str
    description: str | None
    questrade_account_id: str | None = None
    last_questrade_sync: datetime | None = None
    holdings_count: int
    total_value: Decimal | None = None
    total_cost: Decimal | None = None
    total_gain_loss: Decimal | None = None
    total_gain_loss_percent: Decimal | None = None
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}
