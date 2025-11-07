from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.portfolio import Portfolio, Holding
from typing import List, Optional


class PortfolioRepository:
    """Repository for Portfolio database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(
        self, portfolio_id: int, include_holdings: bool = False
    ) -> Optional[Portfolio]:
        """Get portfolio by ID."""
        query = select(Portfolio).where(Portfolio.id == portfolio_id)
        if include_holdings:
            query = query.options(selectinload(Portfolio.holdings))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_user_id(
        self, user_id: int, include_holdings: bool = False
    ) -> List[Portfolio]:
        """Get all portfolios for a user."""
        query = select(Portfolio).where(Portfolio.user_id == user_id)
        if include_holdings:
            query = query.options(selectinload(Portfolio.holdings))
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, name: str, description: str | None, user_id: int) -> Portfolio:
        """Create a new portfolio."""
        portfolio = Portfolio(name=name, description=description, user_id=user_id)
        self.db.add(portfolio)
        await self.db.flush()
        await self.db.refresh(portfolio)
        return portfolio

    async def update(self, portfolio: Portfolio) -> Portfolio:
        """Update an existing portfolio."""
        await self.db.flush()
        await self.db.refresh(portfolio)
        return portfolio

    async def delete(self, portfolio: Portfolio) -> None:
        """Delete a portfolio."""
        await self.db.delete(portfolio)
        await self.db.flush()

    async def get_holding(
        self, portfolio_id: int, symbol: str
    ) -> Optional[Holding]:
        """Get a specific holding in a portfolio."""
        result = await self.db.execute(
            select(Holding).where(
                Holding.portfolio_id == portfolio_id, Holding.symbol == symbol
            )
        )
        return result.scalar_one_or_none()

    async def update_holding(
        self,
        portfolio_id: int,
        symbol: str,
        quantity: float,
        average_cost: float,
        total_cost: float,
    ) -> Holding:
        """Update or create a holding."""
        holding = await self.get_holding(portfolio_id, symbol)
        if holding:
            holding.quantity = quantity
            holding.average_cost = average_cost
            holding.total_cost = total_cost
        else:
            holding = Holding(
                portfolio_id=portfolio_id,
                symbol=symbol,
                quantity=quantity,
                average_cost=average_cost,
                total_cost=total_cost,
            )
            self.db.add(holding)
        await self.db.flush()
        await self.db.refresh(holding)
        return holding

    async def delete_holding(self, portfolio_id: int, symbol: str) -> None:
        """Delete a holding by portfolio_id and symbol."""
        holding = await self.get_holding(portfolio_id, symbol)
        if holding:
            await self.db.delete(holding)
            await self.db.flush()
