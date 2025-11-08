from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum


class TransactionType(str, enum.Enum):
    """Enum for transaction types."""

    BUY = "BUY"
    SELL = "SELL"
    DIVIDEND = "DIVIDEND"


class Currency(str, enum.Enum):
    """Enum for supported currencies."""

    CAD = "CAD"
    USD = "USD"


class Transaction(Base):
    """Transaction model representing buy/sell/dividend actions."""

    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String, nullable=False, index=True)
    transaction_type = Column(SQLEnum(TransactionType), nullable=False)
    quantity = Column(Numeric(precision=18, scale=8), nullable=False)
    price = Column(Numeric(precision=18, scale=2), nullable=False)
    currency = Column(SQLEnum(Currency), nullable=False, default=Currency.CAD)  # Currency of the price
    total_amount = Column(Numeric(precision=18, scale=2), nullable=False)  # quantity * price + fees
    fees = Column(Numeric(precision=18, scale=2), default=0)
    transaction_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    portfolio = relationship("Portfolio", back_populates="transactions")
