from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.config import settings
from app.core.exceptions import UnauthorizedException
from app.repositories.user_repository import UserRepository
from app.models.user import User
from typing import Optional

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to get current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer token credentials
        db: Database session

    Returns:
        Authenticated User object

    Raises:
        UnauthorizedException: If token is invalid or user not found
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise UnauthorizedException("Invalid authentication credentials")
    except JWTError:
        raise UnauthorizedException("Invalid authentication credentials")

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(int(user_id))

    if user is None:
        raise UnauthorizedException("User not found")

    if not user.is_active:
        raise UnauthorizedException("Inactive user")

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to ensure user is active.

    Args:
        current_user: Current authenticated user

    Returns:
        Active User object

    Raises:
        UnauthorizedException: If user is inactive
    """
    if not current_user.is_active:
        raise UnauthorizedException("Inactive user")
    return current_user
