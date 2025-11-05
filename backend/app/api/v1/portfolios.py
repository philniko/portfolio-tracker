from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.session import get_db
from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.portfolio import (
    PortfolioCreate,
    PortfolioUpdate,
    PortfolioResponse,
    PortfolioSummary,
)
from app.repositories.portfolio_repository import PortfolioRepository
from app.repositories.transaction_repository import TransactionRepository
from app.services.portfolio_service import PortfolioService
from app.core.exceptions import NotFoundException, ForbiddenException

router = APIRouter()


@router.get("", response_model=List[PortfolioSummary])
async def list_portfolios(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all portfolios for the current user.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of portfolio summaries
    """
    portfolio_repo = PortfolioRepository(db)
    portfolios = await portfolio_repo.get_by_user_id(current_user.id, include_holdings=True)

    summaries = []
    for portfolio in portfolios:
        summaries.append(
            PortfolioSummary(
                id=portfolio.id,
                name=portfolio.name,
                description=portfolio.description,
                holdings_count=len(portfolio.holdings),
                total_value=None,  # Can be enhanced to calculate
                total_cost=None,
                total_gain_loss=None,
                total_gain_loss_percent=None,
                created_at=portfolio.created_at,
                updated_at=portfolio.updated_at,
            )
        )

    return summaries


@router.post("", response_model=PortfolioResponse, status_code=status.HTTP_201_CREATED)
async def create_portfolio(
    portfolio_data: PortfolioCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new portfolio.

    Args:
        portfolio_data: Portfolio creation data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created portfolio
    """
    portfolio_repo = PortfolioRepository(db)
    portfolio = await portfolio_repo.create(
        name=portfolio_data.name,
        description=portfolio_data.description,
        user_id=current_user.id,
    )

    return PortfolioResponse(
        id=portfolio.id,
        name=portfolio.name,
        description=portfolio.description,
        user_id=portfolio.user_id,
        created_at=portfolio.created_at,
        updated_at=portfolio.updated_at,
        holdings=[],
        total_value=None,
        total_cost=None,
        total_gain_loss=None,
        total_gain_loss_percent=None,
    )


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(
    portfolio_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get portfolio details with real-time data and performance.

    Args:
        portfolio_id: Portfolio ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Portfolio with holdings and performance metrics

    Raises:
        NotFoundException: If portfolio not found or not owned by user
    """
    portfolio_repo = PortfolioRepository(db)
    transaction_repo = TransactionRepository(db)
    portfolio_service = PortfolioService(portfolio_repo, transaction_repo)

    return await portfolio_service.get_portfolio_with_performance(
        portfolio_id, current_user.id
    )


@router.put("/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: int,
    portfolio_data: PortfolioUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update portfolio details.

    Args:
        portfolio_id: Portfolio ID
        portfolio_data: Portfolio update data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated portfolio

    Raises:
        NotFoundException: If portfolio not found or not owned by user
    """
    portfolio_repo = PortfolioRepository(db)
    portfolio = await portfolio_repo.get_by_id(portfolio_id)

    if not portfolio:
        raise NotFoundException("Portfolio not found")

    if portfolio.user_id != current_user.id:
        raise ForbiddenException("Not authorized to update this portfolio")

    if portfolio_data.name is not None:
        portfolio.name = portfolio_data.name
    if portfolio_data.description is not None:
        portfolio.description = portfolio_data.description

    await portfolio_repo.update(portfolio)

    transaction_repo = TransactionRepository(db)
    portfolio_service = PortfolioService(portfolio_repo, transaction_repo)

    return await portfolio_service.get_portfolio_with_performance(
        portfolio_id, current_user.id
    )


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_portfolio(
    portfolio_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a portfolio.

    Args:
        portfolio_id: Portfolio ID
        current_user: Current authenticated user
        db: Database session

    Raises:
        NotFoundException: If portfolio not found or not owned by user
    """
    portfolio_repo = PortfolioRepository(db)
    portfolio = await portfolio_repo.get_by_id(portfolio_id)

    if not portfolio:
        raise NotFoundException("Portfolio not found")

    if portfolio.user_id != current_user.id:
        raise ForbiddenException("Not authorized to delete this portfolio")

    await portfolio_repo.delete(portfolio)
