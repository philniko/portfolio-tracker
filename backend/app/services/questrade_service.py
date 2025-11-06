import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.questrade_connection import QuestradeConnection
from app.models.user import User
from app.core.exceptions import StockDataException
from app.schemas.questrade import (
    QuestradeAuthResponse,
    QuestradePosition,
    QuestradeAccount,
    QuestradeBalance,
    QuestradeActivity,
)


class QuestradeService:
    """Service for interacting with Questrade API."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
        })

    async def get_connection(
        self, db: AsyncSession, user_id: int
    ) -> Optional[QuestradeConnection]:
        """Get Questrade connection for a user."""
        result = await db.execute(
            select(QuestradeConnection).where(QuestradeConnection.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def save_connection(
        self,
        db: AsyncSession,
        user_id: int,
        auth_response: QuestradeAuthResponse,
    ) -> QuestradeConnection:
        """Save or update Questrade connection."""
        connection = await self.get_connection(db, user_id)

        token_expires_at = datetime.utcnow() + timedelta(
            seconds=auth_response.expires_in
        )

        if connection:
            # Update existing connection
            connection.access_token = auth_response.access_token
            connection.refresh_token = auth_response.refresh_token
            connection.api_server = auth_response.api_server
            connection.token_expires_at = token_expires_at
            connection.updated_at = datetime.utcnow()
        else:
            # Create new connection
            connection = QuestradeConnection(
                user_id=user_id,
                access_token=auth_response.access_token,
                refresh_token=auth_response.refresh_token,
                api_server=auth_response.api_server,
                token_expires_at=token_expires_at,
            )
            db.add(connection)

        await db.commit()
        await db.refresh(connection)
        return connection

    async def refresh_token(
        self, db: AsyncSession, connection: QuestradeConnection
    ) -> QuestradeConnection:
        """Refresh the access token using refresh token."""
        try:
            url = "https://login.questrade.com/oauth2/token"
            params = {
                "grant_type": "refresh_token",
                "refresh_token": connection.refresh_token,
            }

            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            auth_response = QuestradeAuthResponse(**data)

            # Update connection with new tokens
            connection = await self.save_connection(
                db, connection.user_id, auth_response
            )
            return connection

        except Exception as e:
            raise StockDataException(f"Failed to refresh Questrade token: {str(e)}")

    async def ensure_valid_token(
        self, db: AsyncSession, connection: QuestradeConnection
    ) -> QuestradeConnection:
        """Ensure the access token is valid, refresh if needed."""
        # Check if token expires in less than 5 minutes
        if connection.token_expires_at < datetime.utcnow() + timedelta(minutes=5):
            connection = await self.refresh_token(db, connection)
        return connection

    async def _make_api_request(
        self, db: AsyncSession, connection: QuestradeConnection, endpoint: str
    ) -> Dict:
        """Make an authenticated API request to Questrade."""
        # Remove trailing slash from api_server to avoid double slashes
        api_server = connection.api_server.rstrip('/')
        url = f"{api_server}/v1/{endpoint}"
        headers = {"Authorization": f"Bearer {connection.access_token}"}

        try:
            response = self.session.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            # If 401, try to refresh token once
            if e.response.status_code == 401:
                try:
                    connection = await self.refresh_token(db, connection)
                    # Retry request with new token
                    api_server = connection.api_server.rstrip('/')
                    url = f"{api_server}/v1/{endpoint}"
                    headers = {"Authorization": f"Bearer {connection.access_token}"}
                    response = self.session.get(url, headers=headers, timeout=10)
                    response.raise_for_status()
                    return response.json()
                except Exception:
                    # If refresh fails, raise original error
                    raise e
            raise

    async def get_accounts(
        self, db: AsyncSession, connection: QuestradeConnection
    ) -> List[QuestradeAccount]:
        """Get list of accounts from Questrade."""
        connection = await self.ensure_valid_token(db, connection)

        try:
            data = await self._make_api_request(db, connection, "accounts")
            accounts = [QuestradeAccount(**account) for account in data.get("accounts", [])]

            # Update stored account IDs
            connection.account_ids = [acc.number for acc in accounts]
            await db.commit()

            return accounts

        except Exception as e:
            raise StockDataException(f"Failed to fetch Questrade accounts: {str(e)}")

    async def get_positions(
        self, db: AsyncSession, connection: QuestradeConnection, account_id: str
    ) -> List[QuestradePosition]:
        """Get positions for a specific account."""
        connection = await self.ensure_valid_token(db, connection)

        try:
            data = await self._make_api_request(db, connection, f"accounts/{account_id}/positions")
            positions = [
                QuestradePosition(**position) for position in data.get("positions", [])
            ]
            return positions

        except Exception as e:
            raise StockDataException(
                f"Failed to fetch positions for account {account_id}: {str(e)}"
            )

    async def get_all_positions(
        self, db: AsyncSession, connection: QuestradeConnection
    ) -> Dict[str, List[QuestradePosition]]:
        """Get positions for all accounts."""
        accounts = await self.get_accounts(db, connection)
        all_positions = {}

        for account in accounts:
            positions = await self.get_positions(db, connection, account.number)
            if positions:
                all_positions[account.number] = positions

        return all_positions

    async def get_balances(
        self, db: AsyncSession, connection: QuestradeConnection, account_id: str
    ) -> List[QuestradeBalance]:
        """Get account balances."""
        connection = await self.ensure_valid_token(db, connection)

        try:
            data = await self._make_api_request(db, connection, f"accounts/{account_id}/balances")

            # Questrade returns per-currency and combined balances
            # Return only combined balances (these show the correct totals)
            combined_balances = data.get("combinedBalances", [])
            balances = [QuestradeBalance(**balance) for balance in combined_balances]
            return balances

        except Exception as e:
            raise StockDataException(
                f"Failed to fetch balances for account {account_id}: {str(e)}"
            )

    async def get_activities(
        self,
        db: AsyncSession,
        connection: QuestradeConnection,
        account_id: str,
        start_date: str,
        end_date: str,
    ) -> List[QuestradeActivity]:
        """
        Get account activities (including dividends).

        Args:
            start_date: Start date in ISO format (YYYY-MM-DD)
            end_date: End date in ISO format (YYYY-MM-DD)

        Note: Maximum 31 days per request
        """
        connection = await self.ensure_valid_token(db, connection)

        try:
            endpoint = f"accounts/{account_id}/activities?startTime={start_date}T00:00:00-05:00&endTime={end_date}T23:59:59-05:00"
            data = await self._make_api_request(db, connection, endpoint)

            activities = [
                QuestradeActivity(**activity) for activity in data.get("activities", [])
            ]
            return activities

        except Exception as e:
            raise StockDataException(
                f"Failed to fetch activities for account {account_id}: {str(e)}"
            )

    async def disconnect(self, db: AsyncSession, user_id: int) -> bool:
        """Disconnect Questrade account."""
        connection = await self.get_connection(db, user_id)
        if connection:
            await db.delete(connection)
            await db.commit()
            return True
        return False


# Singleton instance
questrade_service = QuestradeService()
