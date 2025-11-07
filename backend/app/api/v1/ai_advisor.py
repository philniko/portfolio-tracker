from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.models.portfolio import Portfolio, Holding
from app.models.transaction import Transaction
from app.services.ai_advisor_service import ai_advisor_service
from app.services.stock_service import stock_service
from decimal import Decimal

router = APIRouter()


@router.post("/analyze/{portfolio_id}")
async def analyze_portfolio(
    portfolio_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get AI-powered analysis and investment advice for a portfolio.

    Uses OpenAI GPT-4o-mini to analyze portfolio composition, individual holdings,
    and provide personalized investment recommendations based on current market data.

    Analysis includes:
    - Portfolio overview and diversification assessment
    - Individual stock performance and outlook
    - Risk analysis (concentration, sector exposure)
    - Buy/sell/hold recommendations for each holding
    - Market insights and relevant trends
    - Tax considerations (for Canadian investors)

    The analysis considers:
    - Current holdings with real-time prices
    - Cost basis and unrealized gains/losses
    - Transaction history
    - Overall portfolio performance metrics

    Args:
        portfolio_id: Portfolio ID to analyze
        db: Database session
        current_user: Current authenticated user

    Returns:
        JSON response with markdown-formatted AI analysis

    Raises:
        HTTPException: 404 if portfolio not found or not owned by user
        HTTPException: 503 if OpenAI API is unavailable or not configured

    Note:
        Requires OPENAI_API_KEY to be configured in environment variables.
    """
    # Verify portfolio ownership
    result = await db.execute(
        select(Portfolio).where(
            Portfolio.id == portfolio_id, Portfolio.user_id == current_user.id
        )
    )
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Get holdings with current prices
    result = await db.execute(
        select(Holding).where(Holding.portfolio_id == portfolio_id)
    )
    holdings = result.scalars().all()

    # Fetch current prices for all holdings
    holdings_data = []
    for holding in holdings:
        try:
            stock_data = await stock_service.get_stock_price(holding.symbol)
            current_price = float(stock_data.current_price)
        except Exception:
            current_price = None

        current_value = (
            float(holding.quantity) * current_price if current_price else None
        )
        total_cost_float = float(holding.total_cost)
        unrealized_gain_loss = (
            current_value - total_cost_float if current_value else None
        )
        unrealized_gain_loss_percent = (
            (unrealized_gain_loss / total_cost_float * 100)
            if unrealized_gain_loss and total_cost_float > 0
            else None
        )

        holdings_data.append(
            {
                "symbol": holding.symbol,
                "quantity": float(holding.quantity),
                "average_cost": float(holding.average_cost),
                "total_cost": total_cost_float,
                "current_price": current_price,
                "current_value": current_value,
                "unrealized_gain_loss": unrealized_gain_loss,
                "unrealized_gain_loss_percent": unrealized_gain_loss_percent,
            }
        )

    # Get transactions
    result = await db.execute(
        select(Transaction)
        .where(Transaction.portfolio_id == portfolio_id)
        .order_by(Transaction.transaction_date.desc())
    )
    transactions = result.scalars().all()

    transactions_data = [
        {
            "transaction_type": txn.transaction_type.value,
            "symbol": txn.symbol,
            "quantity": float(txn.quantity),
            "price": float(txn.price),
            "total_amount": float(txn.total_amount),
            "transaction_date": txn.transaction_date.isoformat(),
            "notes": txn.notes,
        }
        for txn in transactions
    ]

    # Calculate portfolio summary
    total_value = sum(h["current_value"] for h in holdings_data if h["current_value"])
    total_cost = sum(h["total_cost"] for h in holdings_data)
    total_gain_loss = total_value - total_cost
    total_gain_loss_percent = (
        (total_gain_loss / total_cost * 100) if total_cost > 0 else 0
    )

    portfolio_data = {
        "name": portfolio.name,
        "total_value": total_value,
        "total_cost": total_cost,
        "total_gain_loss": total_gain_loss,
        "total_gain_loss_percent": total_gain_loss_percent,
    }

    # Get AI analysis
    analysis = await ai_advisor_service.analyze_portfolio(
        portfolio_data, holdings_data, transactions_data
    )

    return {"analysis": analysis}
