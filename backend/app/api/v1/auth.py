from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.schemas.token import Token
from app.services.auth_service import AuthService
from app.repositories.user_repository import UserRepository
from app.core.exceptions import UnauthorizedException
from app.api.dependencies import get_current_active_user

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user.

    Args:
        user_data: User registration data
        db: Database session

    Returns:
        Created user object

    Raises:
        BadRequestException: If email or username already exists
    """
    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo)

    user = await auth_service.register_user(
        email=user_data.email,
        username=user_data.username,
        password=user_data.password,
    )

    return user


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """
    Login and get access token.

    Args:
        credentials: User login credentials
        db: Database session

    Returns:
        JWT access token

    Raises:
        UnauthorizedException: If credentials are invalid
    """
    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo)

    user = await auth_service.authenticate_user(
        email=credentials.email,
        password=credentials.password,
    )

    if not user:
        raise UnauthorizedException("Incorrect email or password")

    token = auth_service.create_user_token(user)

    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user = Depends(get_current_active_user),
):
    """
    Get current user information.

    Args:
        current_user: Current authenticated user

    Returns:
        User object
    """
    return current_user
