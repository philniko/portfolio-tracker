from fastapi import APIRouter
from app.api.v1 import auth, portfolios, transactions, stocks, websocket

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(portfolios.router, prefix="/portfolios", tags=["portfolios"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
api_router.include_router(websocket.router, tags=["websocket"])
