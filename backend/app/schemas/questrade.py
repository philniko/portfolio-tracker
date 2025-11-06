from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class QuestradeAuthResponse(BaseModel):
    """Schema for Questrade OAuth token response."""

    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str
    api_server: str


class QuestradePosition(BaseModel):
    """Schema for Questrade position data."""

    symbol: str
    symbolId: int
    openQuantity: float
    closedQuantity: float
    currentMarketValue: float
    currentPrice: float
    averageEntryPrice: float
    closedPnL: Optional[float] = 0.0
    openPnL: Optional[float] = 0.0
    totalCost: float
    isRealTime: bool
    isUnderReorg: bool


class QuestradeAccount(BaseModel):
    """Schema for Questrade account."""

    type: str
    number: str
    status: str
    isPrimary: bool
    isBilling: bool
    clientAccountType: str


class QuestradeConnectionResponse(BaseModel):
    """Schema for Questrade connection status."""

    connected: bool
    last_sync_at: Optional[datetime] = None
    account_count: int = 0


class QuestradeSyncRequest(BaseModel):
    """Schema for triggering a Questrade sync."""

    portfolio_id: int


class QuestradeBalance(BaseModel):
    """Schema for Questrade account balance."""

    currency: str
    cash: float
    marketValue: float
    totalEquity: float
    buyingPower: float
    maintenanceExcess: float
    isRealTime: bool


class QuestradeActivity(BaseModel):
    """Schema for Questrade account activity."""

    tradeDate: str
    transactionDate: str
    settlementDate: str
    action: str  # e.g., "DIV" for dividends
    symbol: Optional[str] = None
    symbolId: Optional[int] = None
    description: str
    currency: str
    quantity: float
    price: float
    grossAmount: float
    commission: float
    netAmount: float
    type: str
