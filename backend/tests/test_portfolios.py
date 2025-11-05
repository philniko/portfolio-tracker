import pytest
from httpx import AsyncClient
from app.core.config import settings


async def get_auth_token(client: AsyncClient) -> str:
    """Helper function to register and login a user."""
    await client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json={
            "email": "portfoliotest@example.com",
            "username": "portfoliouser",
            "password": "password123",
        },
    )

    login_response = await client.post(
        f"{settings.API_V1_PREFIX}/auth/login",
        json={"email": "portfoliotest@example.com", "password": "password123"},
    )
    return login_response.json()["access_token"]


@pytest.mark.asyncio
async def test_create_portfolio(client: AsyncClient):
    """Test creating a portfolio."""
    token = await get_auth_token(client)

    response = await client.post(
        f"{settings.API_V1_PREFIX}/portfolios",
        json={"name": "Test Portfolio", "description": "My test portfolio"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Portfolio"
    assert data["description"] == "My test portfolio"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_portfolios(client: AsyncClient):
    """Test listing portfolios."""
    token = await get_auth_token(client)

    # Create a few portfolios
    await client.post(
        f"{settings.API_V1_PREFIX}/portfolios",
        json={"name": "Portfolio 1", "description": "First"},
        headers={"Authorization": f"Bearer {token}"},
    )
    await client.post(
        f"{settings.API_V1_PREFIX}/portfolios",
        json={"name": "Portfolio 2", "description": "Second"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # List portfolios
    response = await client.get(
        f"{settings.API_V1_PREFIX}/portfolios",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Portfolio 1"
    assert data[1]["name"] == "Portfolio 2"


@pytest.mark.asyncio
async def test_get_portfolio(client: AsyncClient):
    """Test getting a specific portfolio."""
    token = await get_auth_token(client)

    # Create portfolio
    create_response = await client.post(
        f"{settings.API_V1_PREFIX}/portfolios",
        json={"name": "Get Test Portfolio", "description": "Test"},
        headers={"Authorization": f"Bearer {token}"},
    )
    portfolio_id = create_response.json()["id"]

    # Get portfolio
    response = await client.get(
        f"{settings.API_V1_PREFIX}/portfolios/{portfolio_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Get Test Portfolio"
    assert data["id"] == portfolio_id


@pytest.mark.asyncio
async def test_update_portfolio(client: AsyncClient):
    """Test updating a portfolio."""
    token = await get_auth_token(client)

    # Create portfolio
    create_response = await client.post(
        f"{settings.API_V1_PREFIX}/portfolios",
        json={"name": "Original Name", "description": "Original"},
        headers={"Authorization": f"Bearer {token}"},
    )
    portfolio_id = create_response.json()["id"]

    # Update portfolio
    response = await client.put(
        f"{settings.API_V1_PREFIX}/portfolios/{portfolio_id}",
        json={"name": "Updated Name", "description": "Updated"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["description"] == "Updated"


@pytest.mark.asyncio
async def test_delete_portfolio(client: AsyncClient):
    """Test deleting a portfolio."""
    token = await get_auth_token(client)

    # Create portfolio
    create_response = await client.post(
        f"{settings.API_V1_PREFIX}/portfolios",
        json={"name": "To Delete", "description": "Will be deleted"},
        headers={"Authorization": f"Bearer {token}"},
    )
    portfolio_id = create_response.json()["id"]

    # Delete portfolio
    response = await client.delete(
        f"{settings.API_V1_PREFIX}/portfolios/{portfolio_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 204

    # Verify it's deleted
    get_response = await client.get(
        f"{settings.API_V1_PREFIX}/portfolios/{portfolio_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_response.status_code == 404
