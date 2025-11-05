from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.session import get_db
from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.repositories.portfolio_repository import PortfolioRepository
from app.repositories.transaction_repository import TransactionRepository
from app.services.portfolio_service import PortfolioService
from app.core.exceptions import NotFoundException, ForbiddenException

router = APIRouter()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new transaction (buy/sell/dividend).

    Args:
        transaction_data: Transaction creation data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created transaction

    Raises:
        NotFoundException: If portfolio not found
        ForbiddenException: If portfolio not owned by user
    """
    portfolio_repo = PortfolioRepository(db)
    portfolio = await portfolio_repo.get_by_id(transaction_data.portfolio_id)

    if not portfolio:
        raise NotFoundException("Portfolio not found")

    if portfolio.user_id != current_user.id:
        raise ForbiddenException("Not authorized to add transactions to this portfolio")

    transaction_repo = TransactionRepository(db)
    transaction = await transaction_repo.create(
        portfolio_id=transaction_data.portfolio_id,
        symbol=transaction_data.symbol.upper(),
        transaction_type=transaction_data.transaction_type,
        quantity=transaction_data.quantity,
        price=transaction_data.price,
        fees=transaction_data.fees,
        transaction_date=transaction_data.transaction_date,
        notes=transaction_data.notes,
    )

    # Sync holdings after adding transaction
    portfolio_service = PortfolioService(portfolio_repo, transaction_repo)
    await portfolio_service.sync_holdings(transaction_data.portfolio_id)

    return transaction


@router.get("/portfolio/{portfolio_id}", response_model=List[TransactionResponse])
async def list_transactions(
    portfolio_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all transactions for a portfolio.

    Args:
        portfolio_id: Portfolio ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of transactions

    Raises:
        NotFoundException: If portfolio not found or not owned by user
    """
    portfolio_repo = PortfolioRepository(db)
    portfolio = await portfolio_repo.get_by_id(portfolio_id)

    if not portfolio:
        raise NotFoundException("Portfolio not found")

    if portfolio.user_id != current_user.id:
        raise ForbiddenException("Not authorized to view this portfolio's transactions")

    transaction_repo = TransactionRepository(db)
    transactions = await transaction_repo.get_by_portfolio_id(portfolio_id)

    return transactions


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific transaction.

    Args:
        transaction_id: Transaction ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Transaction details

    Raises:
        NotFoundException: If transaction not found or not owned by user
    """
    transaction_repo = TransactionRepository(db)
    transaction = await transaction_repo.get_by_id(transaction_id)

    if not transaction:
        raise NotFoundException("Transaction not found")

    portfolio_repo = PortfolioRepository(db)
    portfolio = await portfolio_repo.get_by_id(transaction.portfolio_id)

    if not portfolio or portfolio.user_id != current_user.id:
        raise ForbiddenException("Not authorized to view this transaction")

    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a transaction.

    Args:
        transaction_id: Transaction ID
        current_user: Current authenticated user
        db: Database session

    Raises:
        NotFoundException: If transaction not found or not owned by user
    """
    transaction_repo = TransactionRepository(db)
    transaction = await transaction_repo.get_by_id(transaction_id)

    if not transaction:
        raise NotFoundException("Transaction not found")

    portfolio_repo = PortfolioRepository(db)
    portfolio = await portfolio_repo.get_by_id(transaction.portfolio_id)

    if not portfolio or portfolio.user_id != current_user.id:
        raise ForbiddenException("Not authorized to delete this transaction")

    portfolio_id = transaction.portfolio_id
    await transaction_repo.delete(transaction)

    # Sync holdings after deleting transaction
    portfolio_service = PortfolioService(portfolio_repo, transaction_repo)
    await portfolio_service.sync_holdings(portfolio_id)
