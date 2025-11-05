import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Test user registration."""
    response = await client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json={
            "email": "test@example.com",
            "username": "testuser",
            "password": "testpassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["username"] == "testuser"
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Test that duplicate email registration fails."""
    user_data = {
        "email": "duplicate@example.com",
        "username": "user1",
        "password": "password123",
    }

    # Register first user
    response1 = await client.post(
        f"{settings.API_V1_PREFIX}/auth/register", json=user_data
    )
    assert response1.status_code == 201

    # Try to register with same email
    user_data["username"] = "user2"
    response2 = await client.post(
        f"{settings.API_V1_PREFIX}/auth/register", json=user_data
    )
    assert response2.status_code == 400
    assert "Email already registered" in response2.json()["detail"]


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    """Test user login."""
    # Register user first
    await client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json={
            "email": "login@example.com",
            "username": "loginuser",
            "password": "password123",
        },
    )

    # Login
    response = await client.post(
        f"{settings.API_V1_PREFIX}/auth/login",
        json={"email": "login@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Test login with wrong password."""
    # Register user
    await client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json={
            "email": "wrongpass@example.com",
            "username": "wrongpassuser",
            "password": "correctpassword",
        },
    )

    # Try to login with wrong password
    response = await client.post(
        f"{settings.API_V1_PREFIX}/auth/login",
        json={"email": "wrongpass@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient):
    """Test getting current user info."""
    # Register and login
    await client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json={
            "email": "current@example.com",
            "username": "currentuser",
            "password": "password123",
        },
    )

    login_response = await client.post(
        f"{settings.API_V1_PREFIX}/auth/login",
        json={"email": "current@example.com", "password": "password123"},
    )
    token = login_response.json()["access_token"]

    # Get current user
    response = await client.get(
        f"{settings.API_V1_PREFIX}/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "current@example.com"
    assert data["username"] == "currentuser"
