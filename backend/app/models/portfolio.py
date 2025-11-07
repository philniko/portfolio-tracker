from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class Portfolio(Base):
    """Portfolio model representing a user's investment portfolio."""

    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    questrade_account_id = Column(String, nullable=True)  # Linked Questrade account
    last_questrade_sync = Column(DateTime(timezone=True), nullable=True)  # Last sync timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="portfolios")
    transactions = relationship("Transaction", back_populates="portfolio", cascade="all, delete-orphan")
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")


class Holding(Base):
    """
    Holding model representing current positions in a portfolio.
    This is a calculated/derived table updated when transactions occur.
    """

    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String, nullable=False, index=True)
    quantity = Column(Numeric(precision=18, scale=8), nullable=False, default=0)
    average_cost = Column(Numeric(precision=18, scale=2), nullable=False, default=0)  # Average cost per share
    total_cost = Column(Numeric(precision=18, scale=2), nullable=False, default=0)  # Total amount invested
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    portfolio = relationship("Portfolio", back_populates="holdings")

    # Ensure one holding per symbol per portfolio
    __table_args__ = (
        {"schema": None},
    )
