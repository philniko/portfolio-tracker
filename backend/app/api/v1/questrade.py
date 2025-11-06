from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import requests
from urllib.parse import urlencode

from app.api.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.services.questrade_service import questrade_service
from app.services.questrade_sync_service import questrade_sync_service
from app.schemas.questrade import (
    QuestradeAuthResponse,
    QuestradeConnectionResponse,
    QuestradeAccount,
    QuestradePosition,
    QuestradeBalance,
    QuestradeActivity,
)
from app.core.config import settings

router = APIRouter()


@router.post("/connect-with-token")
async def connect_with_refresh_token(
    refresh_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Connect Questrade using a manual refresh token.

    This is simpler than OAuth flow - just provide your refresh token
    from Questrade API portal.
    """
    try:
        # Exchange refresh token for access token
        token_url = "https://login.questrade.com/oauth2/token"
        params = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }

        response = requests.get(token_url, params=params, timeout=10)
        response.raise_for_status()

        # Parse token response
        token_data = response.json()
        auth_response = QuestradeAuthResponse(**token_data)

        # Save connection
        connection = await questrade_service.save_connection(db, current_user.id, auth_response)

        # Fetch accounts immediately to populate account_ids
        try:
            accounts = await questrade_service.get_accounts(db, connection)
            account_count = len(accounts)
        except Exception as e:
            # Connection saved but account fetch failed
            account_count = 0

        return {
            "message": "Questrade connected successfully",
            "api_server": auth_response.api_server,
            "account_count": account_count,
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to connect with refresh token: {str(e)}",
        )


@router.get("/authorize")
async def authorize_questrade(
    current_user: User = Depends(get_current_active_user),
):
    """
    Initiate Questrade OAuth flow.

    Redirects user to Questrade login page for authorization.
    """
    # Build authorization URL
    params = {
        "client_id": settings.QUESTRADE_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": settings.QUESTRADE_REDIRECT_URI,
    }

    auth_url = f"https://login.questrade.com/oauth2/authorize?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def questrade_callback(
    code: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Handle Questrade OAuth callback.

    Exchanges authorization code for access token and saves connection.
    """
    try:
        # Exchange code for access token
        token_url = "https://login.questrade.com/oauth2/token"
        params = {
            "client_id": settings.QUESTRADE_CLIENT_ID,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.QUESTRADE_REDIRECT_URI,
        }

        response = requests.get(token_url, params=params, timeout=10)
        response.raise_for_status()

        # Parse token response
        token_data = response.json()
        auth_response = QuestradeAuthResponse(**token_data)

        # Save connection
        await questrade_service.save_connection(db, current_user.id, auth_response)

        # Redirect to dashboard with success message
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard?questrade_connected=true"
        )

    except Exception as e:
        # Redirect to dashboard with error
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard?questrade_error=true"
        )


@router.get("/status", response_model=QuestradeConnectionResponse)
async def get_questrade_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get Questrade connection status for current user.
    """
    connection = await questrade_service.get_connection(db, current_user.id)

    if not connection:
        return QuestradeConnectionResponse(connected=False, account_count=0)

    # If account_ids is empty, try to fetch them
    if not connection.account_ids or len(connection.account_ids) == 0:
        try:
            await questrade_service.get_accounts(db, connection)
            await db.refresh(connection)
        except:
            pass  # Ignore errors, just return current state

    return QuestradeConnectionResponse(
        connected=True,
        last_sync_at=connection.last_sync_at,
        account_count=len(connection.account_ids) if connection.account_ids else 0,
    )


@router.post("/refresh-accounts")
async def refresh_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Manually refresh account list from Questrade.
    """
    connection = await questrade_service.get_connection(db, current_user.id)

    if not connection:
        raise HTTPException(status_code=404, detail="Questrade not connected")

    try:
        accounts = await questrade_service.get_accounts(db, connection)
        return {
            "message": "Accounts refreshed successfully",
            "account_count": len(accounts),
            "accounts": [{"number": acc.number, "type": acc.type} for acc in accounts],
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh accounts: {str(e)}",
        )


@router.get("/accounts", response_model=List[QuestradeAccount])
async def get_questrade_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get list of Questrade accounts.
    """
    connection = await questrade_service.get_connection(db, current_user.id)

    if not connection:
        raise HTTPException(status_code=404, detail="Questrade not connected")

    accounts = await questrade_service.get_accounts(db, connection)
    return accounts


@router.get("/positions/{account_id}", response_model=List[QuestradePosition])
async def get_questrade_positions(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get positions for a specific Questrade account.
    """
    connection = await questrade_service.get_connection(db, current_user.id)

    if not connection:
        raise HTTPException(status_code=404, detail="Questrade not connected")

    positions = await questrade_service.get_positions(db, connection, account_id)
    return positions


@router.delete("/disconnect")
async def disconnect_questrade(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Disconnect Questrade account.
    """
    success = await questrade_service.disconnect(db, current_user.id)

    if not success:
        raise HTTPException(status_code=404, detail="No Questrade connection found")

    return {"message": "Questrade account disconnected successfully"}


@router.get("/balances/{account_id}", response_model=List[QuestradeBalance])
async def get_questrade_balances(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get account balances including cash positions.
    """
    connection = await questrade_service.get_connection(db, current_user.id)

    if not connection:
        raise HTTPException(status_code=404, detail="Questrade not connected")

    balances = await questrade_service.get_balances(db, connection, account_id)
    return balances


@router.get("/activities/{account_id}")
async def get_questrade_activities(
    account_id: str,
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get account activities including dividends.

    Note: Maximum 31 days per request.
    """
    connection = await questrade_service.get_connection(db, current_user.id)

    if not connection:
        raise HTTPException(status_code=404, detail="Questrade not connected")

    activities = await questrade_service.get_activities(
        db, connection, account_id, start_date, end_date
    )
    return activities


@router.post("/sync/{portfolio_id}/{account_id}")
async def sync_questrade_to_portfolio(
    portfolio_id: int,
    account_id: str,
    include_dividends: bool = Query(True, description="Include dividend history"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Sync Questrade account positions to a portfolio.

    Creates BUY transactions for all positions and optionally DIVIDEND transactions.
    """
    try:
        result = await questrade_sync_service.sync_account_to_portfolio(
            db, current_user.id, portfolio_id, account_id, include_dividends
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync positions: {str(e)}",
        )
