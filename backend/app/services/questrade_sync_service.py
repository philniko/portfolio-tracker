from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime
from decimal import Decimal
from typing import Dict

from app.models.transaction import Transaction, TransactionType
from app.models.portfolio import Portfolio, Holding
from app.services.questrade_service import questrade_service
from app.core.exceptions import PortfolioTrackerException


class QuestradeSyncService:
    """Service for syncing Questrade positions to portfolios."""

    async def sync_account_to_portfolio(
        self,
        db: AsyncSession,
        user_id: int,
        portfolio_id: int,
        account_id: str,
        include_dividends: bool = True,
    ) -> dict:
        """
        Sync Questrade account positions to a portfolio.

        Creates BUY transactions for all positions in the account.
        """
        # Get Questrade connection
        connection = await questrade_service.get_connection(db, user_id)
        if not connection:
            raise PortfolioTrackerException(
                "Questrade not connected", status_code=404
            )

        # Verify portfolio ownership
        result = await db.execute(
            select(Portfolio).where(
                Portfolio.id == portfolio_id, Portfolio.user_id == user_id
            )
        )
        portfolio = result.scalar_one_or_none()

        if not portfolio:
            raise PortfolioTrackerException(
                "Portfolio not found", status_code=404
            )

        # Get positions from Questrade
        positions = await questrade_service.get_positions(db, connection, account_id)

        # Get balances from Questrade to sync cash
        balances, balance_data = await questrade_service.get_balances(db, connection, account_id)

        # Get total cash from combined balances (already in CAD, includes all currencies)
        # We store this as CAD cash and set USD cash to 0 to avoid double-counting
        combined_balances = balance_data.get("combinedBalances", [])
        total_cash_cad = Decimal("0")
        for balance in combined_balances:
            if balance.get("currency") == "CAD":
                total_cash_cad = Decimal(str(balance.get("cash", 0)))
                break

        portfolio.cash_balance_cad = total_cash_cad
        portfolio.cash_balance_usd = Decimal("0")  # Already included in CAD total

        # For return messages
        cash_cad = total_cash_cad
        cash_usd = Decimal("0")

        # Calculate USD/CAD forex rate from Questrade's balances
        # Use market values to derive the exact conversion rate
        per_currency_balances = balance_data.get("perCurrencyBalances", [])

        usd_market_value = None
        cad_market_value = None
        combined_market_value = None

        # Get market values from per-currency balances
        for pcb in per_currency_balances:
            if pcb.get("currency") == "USD":
                usd_market_value = Decimal(str(pcb.get("marketValue", 0)))
            elif pcb.get("currency") == "CAD":
                cad_market_value = Decimal(str(pcb.get("marketValue", 0)))

        # Get combined CAD market value (includes USD converted to CAD)
        for cb in combined_balances:
            if cb.get("currency") == "CAD":
                combined_market_value = Decimal(str(cb.get("marketValue", 0)))
                break

        # Calculate the forex rate Questrade is using
        if usd_market_value and usd_market_value > 0 and combined_market_value and cad_market_value is not None:
            # The difference between CAD combined market value and CAD-only market value is USD converted
            usd_in_cad = combined_market_value - cad_market_value
            # Derive the rate: USD amount * rate = CAD amount
            questrade_rate = usd_in_cad / usd_market_value
            portfolio.questrade_forex_rate = questrade_rate

        if not positions:
            # Still update sync info even if no positions
            portfolio.questrade_account_id = account_id
            portfolio.last_questrade_sync = datetime.utcnow()
            connection.last_sync_at = datetime.utcnow()
            await db.commit()

            return {
                "message": f"No positions to sync. Cash updated: ${cash_cad} CAD, ${cash_usd} USD",
                "synced_count": 0,
            }

        # Create transactions for each position
        synced_count = 0
        skipped_count = 0
        for position in positions:
            # Only sync open positions
            if position.openQuantity <= 0:
                continue

            # Check if this position was already synced for this portfolio
            result = await db.execute(
                select(Transaction).where(
                    Transaction.portfolio_id == portfolio_id,
                    Transaction.symbol == position.symbol,
                    Transaction.transaction_type == TransactionType.BUY,
                    Transaction.notes.contains(f"Synced from Questrade account {account_id}")
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                skipped_count += 1
                continue  # Skip duplicate position

            # Create a BUY transaction for the position
            transaction = Transaction(
                portfolio_id=portfolio_id,
                symbol=position.symbol,
                transaction_type=TransactionType.BUY,
                quantity=Decimal(str(position.openQuantity)),
                price=Decimal(str(position.averageEntryPrice)),
                fees=Decimal("0.00"),  # Questrade doesn't provide fee info in positions
                total_amount=Decimal(str(position.totalCost)),
                transaction_date=datetime.utcnow(),  # Use current date as we don't have purchase date
                notes=f"Synced from Questrade account {account_id}",
            )

            db.add(transaction)
            synced_count += 1

        await db.commit()

        # Sync dividends if requested
        dividend_count = 0
        if include_dividends:
            dividend_count = await self._sync_dividends(
                db, connection, portfolio_id, account_id
            )

        # Update holdings table from transactions using portfolio service
        # This will fetch real currency data from stock prices
        from app.repositories.portfolio_repository import PortfolioRepository
        from app.repositories.transaction_repository import TransactionRepository
        from app.services.portfolio_service import PortfolioService

        portfolio_repo = PortfolioRepository(db)
        transaction_repo = TransactionRepository(db)
        portfolio_service = PortfolioService(portfolio_repo, transaction_repo)
        await portfolio_service.sync_holdings(portfolio_id)

        # Update portfolio with Questrade sync info
        portfolio.questrade_account_id = account_id
        portfolio.last_questrade_sync = datetime.utcnow()

        # Update last sync time on connection
        connection.last_sync_at = datetime.utcnow()
        await db.commit()

        message = f"Successfully synced {synced_count} positions"
        if skipped_count > 0:
            message += f" ({skipped_count} already imported)"
        if dividend_count > 0:
            message += f" and {dividend_count} dividends"
        message += f". Cash: ${cash_cad} CAD, ${cash_usd} USD"

        return {
            "message": message,
            "synced_count": synced_count,
            "dividend_count": dividend_count,
            "skipped_count": skipped_count,
            "cash_cad": float(cash_cad),
            "cash_usd": float(cash_usd),
        }

    async def _sync_dividends(
        self,
        db: AsyncSession,
        connection,
        portfolio_id: int,
        account_id: str,
    ) -> int:
        """Sync dividend, interest, and distribution transactions from the last year."""
        from datetime import timedelta

        # Get dividends from last 365 days (in chunks of 31 days max)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=365)

        all_dividends = []
        current_start = start_date

        # Fetch in 30-day chunks (Questrade max is 31 days)
        while current_start < end_date:
            # Use 29 days to stay safely under the 31-day limit
            current_end = min(current_start + timedelta(days=29), end_date)

            start_str = current_start.strftime("%Y-%m-%d")
            end_str = current_end.strftime("%Y-%m-%d")

            try:
                activities = await questrade_service.get_activities(
                    db, connection, account_id, start_str, end_str
                )

                # Filter for dividend and distribution activities
                # DIV = dividend, DIVNRA = non-resident alien dividend
                # INT = interest, MFD = mutual fund distribution
                # DIST = distribution, ROC = return of capital
                # CGD = capital gains distribution
                # Blank action ('   ') with type='Dividends' = ETF distributions
                dividends = [
                    act
                    for act in activities
                    if (act.action in ["DIV", "DIVNRA", "INT", "MFD", "DIST", "ROC", "CGD"] or
                        (act.action.strip() == '' and act.type == 'Dividends'))
                ]

                all_dividends.extend(dividends)

            except Exception:
                # Silently skip periods that fail to fetch
                pass

            current_start = current_end + timedelta(days=1)

        # Create DIVIDEND transactions
        dividend_count = 0
        for div in all_dividends:
            if not div.symbol:
                continue  # Skip dividends without symbol

            # Parse transaction date
            txn_datetime = datetime.fromisoformat(div.transactionDate.replace('Z', '+00:00'))

            # Check if this dividend was already imported
            # Compare date (not datetime) and amount to detect duplicates
            result = await db.execute(
                select(Transaction).where(
                    and_(
                        Transaction.portfolio_id == portfolio_id,
                        Transaction.symbol == div.symbol,
                        Transaction.transaction_type == TransactionType.DIVIDEND,
                        func.date(Transaction.transaction_date) == txn_datetime.date(),
                        Transaction.total_amount == abs(Decimal(str(div.netAmount)))
                    )
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                continue  # Skip duplicate

            # Determine distribution type for notes
            if div.action.strip() == '' and div.type == 'Dividends':
                # ETF distributions have blank action code
                distribution_type = "ETF Distribution"
            else:
                distribution_type = {
                    "DIV": "Dividend",
                    "DIVNRA": "Dividend (Non-Resident)",
                    "INT": "Interest",
                    "MFD": "Mutual Fund Distribution",
                    "DIST": "Distribution",
                    "ROC": "Return of Capital",
                    "CGD": "Capital Gains Distribution"
                }.get(div.action, "Payment")

            transaction = Transaction(
                portfolio_id=portfolio_id,
                symbol=div.symbol,
                transaction_type=TransactionType.DIVIDEND,
                quantity=Decimal("1"),  # Dividends don't have quantity
                price=abs(Decimal(str(div.netAmount))),
                fees=Decimal("0.00"),
                total_amount=abs(Decimal(str(div.netAmount))),
                transaction_date=datetime.fromisoformat(div.transactionDate.replace('Z', '+00:00')),
                notes=f"{distribution_type}: {div.description}",
            )

            db.add(transaction)
            dividend_count += 1

        await db.commit()
        return dividend_count


# Singleton instance
questrade_sync_service = QuestradeSyncService()
