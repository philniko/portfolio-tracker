from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.transaction import Transaction, TransactionType
from datetime import datetime
from decimal import Decimal
from typing import List, Optional


class TransactionRepository:
    """Repository for Transaction database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, transaction_id: int) -> Optional[Transaction]:
        """Get transaction by ID."""
        result = await self.db.execute(
            select(Transaction).where(Transaction.id == transaction_id)
        )
        return result.scalar_one_or_none()

    async def get_by_portfolio_id(self, portfolio_id: int) -> List[Transaction]:
        """Get all transactions for a portfolio, ordered by date."""
        result = await self.db.execute(
            select(Transaction)
            .where(Transaction.portfolio_id == portfolio_id)
            .order_by(desc(Transaction.transaction_date))
        )
        return list(result.scalars().all())

    async def get_by_portfolio_and_symbol(
        self, portfolio_id: int, symbol: str
    ) -> List[Transaction]:
        """Get all transactions for a specific symbol in a portfolio."""
        result = await self.db.execute(
            select(Transaction)
            .where(
                Transaction.portfolio_id == portfolio_id,
                Transaction.symbol == symbol,
            )
            .order_by(Transaction.transaction_date)
        )
        return list(result.scalars().all())

    async def create(
        self,
        portfolio_id: int,
        symbol: str,
        transaction_type: TransactionType,
        quantity: Decimal,
        price: Decimal,
        fees: Decimal,
        transaction_date: datetime,
        notes: str | None = None,
    ) -> Transaction:
        """Create a new transaction."""
        total_amount = (quantity * price) + fees
        transaction = Transaction(
            portfolio_id=portfolio_id,
            symbol=symbol,
            transaction_type=transaction_type,
            quantity=quantity,
            price=price,
            total_amount=total_amount,
            fees=fees,
            transaction_date=transaction_date,
            notes=notes,
        )
        self.db.add(transaction)
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    async def update(self, transaction: Transaction) -> Transaction:
        """Update an existing transaction."""
        # Recalculate total_amount
        transaction.total_amount = (
            transaction.quantity * transaction.price
        ) + transaction.fees
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    async def delete(self, transaction: Transaction) -> None:
        """Delete a transaction."""
        await self.db.delete(transaction)
        await self.db.flush()
