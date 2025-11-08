from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from typing import List
from app.models.transaction import Currency


class PortfolioBase(BaseModel):
    """Base portfolio schema."""

    name: str = Field(..., min_length=1, max_length=100, description="Portfolio name")
    description: str | None = Field(None, description="Portfolio description")
    cash_balance_cad: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        description="Cash balance in CAD (synced from Questrade or manually set)"
    )
    cash_balance_usd: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        description="Cash balance in USD (synced from Questrade or manually set)"
    )


class PortfolioCreate(PortfolioBase):
    """Schema for creating a portfolio."""

    pass


class PortfolioUpdate(BaseModel):
    """Schema for updating a portfolio."""

    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    cash_balance_cad: Decimal | None = Field(None, ge=0)
    cash_balance_usd: Decimal | None = Field(None, ge=0)


class HoldingResponse(BaseModel):
    """Schema for holding response."""

    id: int
    symbol: str = Field(..., description="Stock ticker symbol")
    quantity: Decimal = Field(..., description="Number of shares held")
    average_cost: Decimal = Field(..., description="Average cost per share")
    total_cost: Decimal = Field(..., description="Total cost basis")
    currency: Currency = Field(..., description="Currency of the holding (CAD or USD)")
    current_price: Decimal | None = Field(None, description="Current market price (real-time)")
    current_value: Decimal | None = Field(None, description="Current value (quantity × current_price)")
    unrealized_gain_loss: Decimal | None = Field(None, description="Unrealized gain/loss (current_value - total_cost)")
    unrealized_gain_loss_percent: Decimal | None = Field(None, description="Unrealized gain/loss percentage")
    updated_at: datetime

    model_config = {"from_attributes": True}


class PortfolioResponse(PortfolioBase):
    """Schema for portfolio response."""

    id: int
    user_id: int
    questrade_account_id: str | None = Field(None, description="Questrade account ID if synced")
    last_questrade_sync: datetime | None = Field(None, description="Last Questrade sync timestamp")
    created_at: datetime
    updated_at: datetime | None
    holdings: List[HoldingResponse] = Field(default=[], description="List of holdings in the portfolio")
    total_value: Decimal | None = Field(None, description="Total portfolio value in CAD (excluding cash)")
    total_cost: Decimal | None = Field(None, description="Total cost basis in CAD")
    total_gain_loss: Decimal | None = Field(None, description="Total unrealized gain/loss in CAD")
    total_gain_loss_percent: Decimal | None = Field(None, description="Total unrealized gain/loss percentage")
    total_value_with_cash: Decimal | None = Field(
        None,
        description="Total portfolio value including cash balances (all in CAD)"
    )

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
