from app.repositories.user_repository import UserRepository
from app.core.security import verify_password, create_access_token
from app.core.exceptions import UnauthorizedException, BadRequestException
from app.models.user import User
from typing import Optional


class AuthService:
    """Service for authentication operations."""

    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """
        Authenticate user with email and password.

        Args:
            email: User email
            password: Plain text password

        Returns:
            User object if authentication successful, None otherwise
        """
        user = await self.user_repo.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    async def register_user(
        self, email: str, username: str, password: str
    ) -> User:
        """
        Register a new user.

        Args:
            email: User email
            username: Username
            password: Plain text password

        Returns:
            Created User object

        Raises:
            BadRequestException: If email or username already exists
        """
        # Check if email already exists
        existing_user = await self.user_repo.get_by_email(email)
        if existing_user:
            raise BadRequestException("Email already registered")

        # Check if username already exists
        existing_user = await self.user_repo.get_by_username(username)
        if existing_user:
            raise BadRequestException("Username already taken")

        # Create new user
        user = await self.user_repo.create(email, username, password)
        return user

    def create_user_token(self, user: User) -> str:
        """
        Create JWT access token for user.

        Args:
            user: User object

        Returns:
            JWT token string
        """
        return create_access_token(subject=user.id)
