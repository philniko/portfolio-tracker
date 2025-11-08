from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.exceptions import PortfolioTrackerException
from app.api.v1 import api_router
from contextlib import asynccontextmanager
from app.services.stock_service import stock_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    await stock_service.init_redis()
    yield
    # Shutdown
    await stock_service.close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    description="""
A production-grade portfolio tracker API with real-time stock data, Questrade integration, and AI-powered analysis.

## Features

* **Portfolio Management**: Create and track multiple investment portfolios with real-time valuations
* **Transaction Tracking**: Record buy/sell/dividend transactions with automatic cost basis calculation
* **Real-Time Market Data**: Live stock prices via Yahoo Finance with Redis caching
* **Questrade Integration**: Brokerage integration for automatic position and dividend syncing
* **AI Portfolio Analysis**: GPT-4o-powered investment insights and recommendations
* **WebSocket Support**: Real-time portfolio updates via WebSocket connections
* **Secure Authentication**: JWT-based auth with bcrypt password hashing

## Getting Started

1. Register an account via `/api/v1/auth/register`
2. Login to get your JWT token via `/api/v1/auth/login`
3. Create a portfolio via `/api/v1/portfolios`
4. Add transactions or connect Questrade to import positions
5. Get AI-powered analysis via `/api/v1/ai/analyze/{portfolio_id}`
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(PortfolioTrackerException)
async def portfolio_tracker_exception_handler(
    request: Request, exc: PortfolioTrackerException
):
    """Handle custom application exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    if settings.DEBUG:
        # In debug mode, return full error details
        import traceback
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Internal server error",
                "error": str(exc),
                "traceback": traceback.format_exc(),
            },
        )
    else:
        # In production, return generic error
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )


# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": settings.APP_NAME}


# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
