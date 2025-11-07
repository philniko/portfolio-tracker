from decimal import Decimal
from typing import List, Dict
from app.models.portfolio import Portfolio, Holding
from app.models.transaction import Transaction, TransactionType
from app.repositories.portfolio_repository import PortfolioRepository
from app.repositories.transaction_repository import TransactionRepository
from app.services.stock_service import stock_service
from app.schemas.portfolio import HoldingResponse, PortfolioResponse
from app.core.exceptions import NotFoundException


class PortfolioService:
    """Service for portfolio calculations and management."""

    def __init__(
        self,
        portfolio_repo: PortfolioRepository,
        transaction_repo: TransactionRepository,
    ):
        self.portfolio_repo = portfolio_repo
        self.transaction_repo = transaction_repo

    async def calculate_holdings_from_transactions(
        self, portfolio_id: int
    ) -> Dict[str, Dict[str, Decimal]]:
        """
        Calculate current holdings and cost basis from all transactions.

        Returns:
            Dictionary mapping symbol to {quantity, average_cost, total_cost}
        """
        transactions = await self.transaction_repo.get_by_portfolio_id(portfolio_id)
        holdings: Dict[str, Dict[str, Decimal]] = {}

        for txn in sorted(transactions, key=lambda x: x.transaction_date):
            symbol = txn.symbol.upper()

            if symbol not in holdings:
                holdings[symbol] = {
                    "quantity": Decimal("0"),
                    "total_cost": Decimal("0"),
                    "average_cost": Decimal("0"),
                }

            if txn.transaction_type == TransactionType.BUY:
                # Add to position
                new_quantity = holdings[symbol]["quantity"] + txn.quantity
                new_total_cost = holdings[symbol]["total_cost"] + txn.total_amount
                holdings[symbol]["quantity"] = new_quantity
                holdings[symbol]["total_cost"] = new_total_cost
                holdings[symbol]["average_cost"] = (
                    new_total_cost / new_quantity if new_quantity > 0 else Decimal("0")
                )

            elif txn.transaction_type == TransactionType.SELL:
                # Reduce position
                holdings[symbol]["quantity"] -= txn.quantity
                # Reduce cost basis proportionally
                if holdings[symbol]["quantity"] > 0:
                    cost_reduction = holdings[symbol]["average_cost"] * txn.quantity
                    holdings[symbol]["total_cost"] -= cost_reduction
                else:
                    # Position closed
                    holdings[symbol]["total_cost"] = Decimal("0")
                    holdings[symbol]["average_cost"] = Decimal("0")

            elif txn.transaction_type == TransactionType.DIVIDEND:
                # Dividends reduce cost basis
                holdings[symbol]["total_cost"] -= txn.total_amount

        # Remove positions with zero or negative quantity
        holdings = {
            symbol: data
            for symbol, data in holdings.items()
            if data["quantity"] > Decimal("0")
        }

        return holdings

    async def sync_holdings(self, portfolio_id: int) -> None:
        """
        Synchronize holdings table with calculated values from transactions.
        """
        calculated_holdings = await self.calculate_holdings_from_transactions(
            portfolio_id
        )

        # Get current holdings from database
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id, include_holdings=True)
        current_symbols = {h.symbol for h in portfolio.holdings} if portfolio else set()
        calculated_symbols = set(calculated_holdings.keys())

        # Update or create holdings that exist in calculated
        for symbol, data in calculated_holdings.items():
            await self.portfolio_repo.update_holding(
                portfolio_id=portfolio_id,
                symbol=symbol,
                quantity=float(data["quantity"]),
                average_cost=float(data["average_cost"]),
                total_cost=float(data["total_cost"]),
            )

        # Delete holdings that no longer exist (sold all shares)
        symbols_to_delete = current_symbols - calculated_symbols
        for symbol in symbols_to_delete:
            await self.portfolio_repo.delete_holding(portfolio_id, symbol)

    async def get_portfolio_with_performance(
        self, portfolio_id: int, user_id: int
    ) -> PortfolioResponse:
        """
        Get portfolio with real-time prices and performance calculations.

        Args:
            portfolio_id: Portfolio ID
            user_id: User ID for authorization check

        Returns:
            PortfolioResponse with all holdings and calculated metrics
        """
        portfolio = await self.portfolio_repo.get_by_id(
            portfolio_id, include_holdings=True
        )

        if not portfolio:
            raise NotFoundException("Portfolio not found")

        if portfolio.user_id != user_id:
            raise NotFoundException("Portfolio not found")

        # Get current prices for all holdings
        symbols = [h.symbol for h in portfolio.holdings]
        prices = await stock_service.get_multiple_stock_prices(symbols)

        # Calculate metrics for each holding
        holdings_response: List[HoldingResponse] = []
        total_value = Decimal("0")
        total_cost = Decimal("0")

        for holding in portfolio.holdings:
            current_price = None
            current_value = None
            unrealized_gain_loss = None
            unrealized_gain_loss_percent = None

            if holding.symbol in prices:
                price_data = prices[holding.symbol]
                current_price = price_data.current_price
                current_value = Decimal(str(holding.quantity)) * current_price
                unrealized_gain_loss = current_value - Decimal(str(holding.total_cost))
                unrealized_gain_loss_percent = (
                    (unrealized_gain_loss / Decimal(str(holding.total_cost)) * 100)
                    if holding.total_cost > 0
                    else Decimal("0")
                )

                total_value += current_value
                total_cost += Decimal(str(holding.total_cost))

            holdings_response.append(
                HoldingResponse(
                    id=holding.id,
                    symbol=holding.symbol,
                    quantity=holding.quantity,
                    average_cost=holding.average_cost,
                    total_cost=holding.total_cost,
                    current_price=current_price,
                    current_value=current_value,
                    unrealized_gain_loss=unrealized_gain_loss,
                    unrealized_gain_loss_percent=unrealized_gain_loss_percent,
                    updated_at=holding.updated_at,
                )
            )

        # Calculate portfolio-level metrics
        total_gain_loss = total_value - total_cost if total_value and total_cost else None
        total_gain_loss_percent = (
            (total_gain_loss / total_cost * 100) if total_gain_loss and total_cost > 0 else None
        )

        return PortfolioResponse(
            id=portfolio.id,
            name=portfolio.name,
            description=portfolio.description,
            user_id=portfolio.user_id,
            questrade_account_id=portfolio.questrade_account_id,
            last_questrade_sync=portfolio.last_questrade_sync,
            created_at=portfolio.created_at,
            updated_at=portfolio.updated_at,
            holdings=holdings_response,
            total_value=total_value,
            total_cost=total_cost,
            total_gain_loss=total_gain_loss,
            total_gain_loss_percent=total_gain_loss_percent,
        )
