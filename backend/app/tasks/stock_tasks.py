from app.tasks.celery_app import celery_app
from app.services.stock_service import stock_service
import asyncio


@celery_app.task(name="refresh_stock_prices")
def refresh_stock_prices(symbols: list[str]):
    """
    Background task to refresh stock prices for given symbols.

    This task can be scheduled to run periodically to pre-warm the cache
    with fresh stock data.

    Args:
        symbols: List of stock ticker symbols to refresh
    """
    loop = asyncio.get_event_loop()
    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    try:
        result = loop.run_until_complete(
            stock_service.get_multiple_stock_prices(symbols)
        )
        return {
            "status": "success",
            "symbols_refreshed": len(result),
            "symbols": list(result.keys()),
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
    finally:
        if not loop.is_running():
            loop.close()


@celery_app.task(name="warm_cache_for_portfolios")
def warm_cache_for_portfolios():
    """
    Background task to warm the cache with stock prices for all active portfolios.

    This can be scheduled to run every few minutes to ensure fresh data.
    """
    # TODO: Implement logic to fetch all unique symbols from active portfolios
    # and refresh their prices
    # This would require database access in the task
    pass


# Periodic task configuration (add to celery beat schedule)
celery_app.conf.beat_schedule = {
    'refresh-popular-stocks-every-5-minutes': {
        'task': 'refresh_stock_prices',
        'schedule': 300.0,  # 5 minutes
        'args': (['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'],)  # Example popular stocks
    },
}
