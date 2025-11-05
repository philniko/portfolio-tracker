from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, Set
import asyncio
import json
from app.services.stock_service import stock_service
from app.core.exceptions import UnauthorizedException
from jose import jwt, JWTError
from app.core.config import settings

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """Add a new WebSocket connection."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        """Remove a WebSocket connection."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket."""
        await websocket.send_text(message)

    async def broadcast_to_user(self, message: str, user_id: int):
        """Broadcast a message to all connections of a specific user."""
        if user_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    disconnected.add(connection)
            # Remove disconnected connections
            for conn in disconnected:
                self.active_connections[user_id].discard(conn)


manager = ConnectionManager()


def verify_websocket_token(token: str) -> int:
    """
    Verify JWT token from WebSocket and return user_id.

    Args:
        token: JWT token string

    Returns:
        User ID

    Raises:
        UnauthorizedException: If token is invalid
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise UnauthorizedException("Invalid token")
        return int(user_id)
    except JWTError:
        raise UnauthorizedException("Invalid token")


@router.websocket("/ws/portfolio/{portfolio_id}")
async def websocket_portfolio_updates(
    websocket: WebSocket,
    portfolio_id: int,
    token: str,
):
    """
    WebSocket endpoint for real-time portfolio updates.

    Args:
        websocket: WebSocket connection
        portfolio_id: Portfolio ID to subscribe to
        token: JWT authentication token (passed as query parameter)

    Usage:
        ws://localhost:8000/api/v1/ws/portfolio/1?token=YOUR_JWT_TOKEN
    """
    try:
        # Verify token
        user_id = verify_websocket_token(token)
    except UnauthorizedException:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    await manager.connect(websocket, user_id)

    try:
        # Send initial connection message
        await manager.send_personal_message(
            json.dumps({"type": "connection", "status": "connected"}),
            websocket
        )

        # Keep connection alive and send periodic updates
        while True:
            try:
                # Wait for client messages (can be used for requesting specific data)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)

                if message.get("action") == "subscribe_symbols":
                    # Client can subscribe to specific symbols for updates
                    symbols = message.get("symbols", [])
                    if symbols:
                        prices = await stock_service.get_multiple_stock_prices(symbols)
                        await manager.send_personal_message(
                            json.dumps({
                                "type": "price_update",
                                "portfolio_id": portfolio_id,
                                "prices": {
                                    symbol: {
                                        "symbol": data.symbol,
                                        "current_price": str(data.current_price),
                                        "change": str(data.change) if data.change else None,
                                        "change_percent": str(data.change_percent) if data.change_percent else None,
                                    }
                                    for symbol, data in prices.items()
                                }
                            }),
                            websocket
                        )

            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await manager.send_personal_message(
                    json.dumps({"type": "ping"}),
                    websocket
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        manager.disconnect(websocket, user_id)
        print(f"WebSocket error: {e}")
