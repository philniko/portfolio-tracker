# Quick Start Guide

Get your Portfolio Tracker up and running in minutes!

## Using Docker (Easiest Method)

### 1. Prerequisites
- Docker Desktop installed
- Git installed

### 2. Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd portfolio_tracker

# The .env file is already configured for local development

# Start all services
docker-compose up -d

# Wait for services to be healthy (about 30 seconds)
docker-compose ps

# Run database migrations
docker-compose exec backend alembic upgrade head
```

### 3. Verify Installation

**Check Backend:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","service":"Portfolio Tracker"}
```

**Access API Documentation:**
Open http://localhost:8000/api/docs in your browser

### 4. Create Your First User

Using the API docs (http://localhost:8000/api/docs):

1. Go to `POST /api/v1/auth/register`
2. Click "Try it out"
3. Enter:
```json
{
  "email": "demo@example.com",
  "username": "demo",
  "password": "password123"
}
```
4. Click "Execute"

### 5. Login and Get Token

1. Go to `POST /api/v1/auth/login`
2. Click "Try it out"
3. Enter:
```json
{
  "email": "demo@example.com",
  "password": "password123"
}
```
4. Click "Execute"
5. Copy the `access_token` from the response

### 6. Authorize Swagger UI

1. Click the "Authorize" button at the top of the API docs
2. Enter: `Bearer YOUR_ACCESS_TOKEN`
3. Click "Authorize"

Now you can test all endpoints!

### 7. Create Your First Portfolio

1. Go to `POST /api/v1/portfolios`
2. Click "Try it out"
3. Enter:
```json
{
  "name": "My Tech Portfolio",
  "description": "Long-term tech stocks"
}
```
4. Click "Execute"
5. Note the portfolio `id` from the response

### 8. Add a Transaction

1. Go to `POST /api/v1/transactions`
2. Enter:
```json
{
  "portfolio_id": 1,
  "symbol": "AAPL",
  "transaction_type": "BUY",
  "quantity": 10,
  "price": 150.50,
  "fees": 0,
  "transaction_date": "2024-01-15T10:30:00Z",
  "notes": "Initial purchase"
}
```
3. Click "Execute"

### 9. View Portfolio with Real-Time Data

1. Go to `GET /api/v1/portfolios/{portfolio_id}`
2. Enter your portfolio ID
3. Click "Execute"
4. See real-time stock prices, P&L, and performance metrics!

## Using Local Development Setup

### 1. Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Node.js 18+

### 2. Backend Setup

```bash
# Create and activate virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create database
createdb portfolio_tracker

# The .env file is already configured

# Run migrations
alembic upgrade head

# In separate terminals, start:
# Terminal 1: Redis
redis-server

# Terminal 2: Celery Worker
celery -A app.tasks.celery_app worker --loglevel=info

# Terminal 3: Celery Beat
celery -A app.tasks.celery_app beat --loglevel=info

# Terminal 4: Backend Server
uvicorn app.main:app --reload
```

### 3. Frontend Setup

```bash
# In a new terminal
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Access the frontend at http://localhost:5173

## Testing the API with cURL

### Register
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the token:
```bash
TOKEN="your_access_token_here"
```

### Create Portfolio
```bash
curl -X POST http://localhost:8000/api/v1/portfolios \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Portfolio",
    "description": "Investment portfolio"
  }'
```

### Add Transaction
```bash
curl -X POST http://localhost:8000/api/v1/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio_id": 1,
    "symbol": "AAPL",
    "transaction_type": "BUY",
    "quantity": 10,
    "price": 150.50,
    "fees": 0,
    "transaction_date": "2024-01-15T10:30:00Z"
  }'
```

### Get Portfolio
```bash
curl -X GET http://localhost:8000/api/v1/portfolios/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Get Stock Price
```bash
curl -X GET http://localhost:8000/api/v1/stocks/AAPL \
  -H "Authorization: Bearer $TOKEN"
```

## Common Issues & Solutions

### Issue: Port already in use
```bash
# Find process using port 8000
lsof -ti:8000 | xargs kill -9

# Find process using port 5432 (PostgreSQL)
lsof -ti:5432 | xargs kill -9
```

### Issue: Database connection error
```bash
# Check if PostgreSQL is running
pg_isready

# Restart PostgreSQL
brew services restart postgresql@15  # macOS
sudo systemctl restart postgresql    # Linux
```

### Issue: Redis connection error
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
redis-server
```

### Issue: Module not found
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Issue: Docker containers won't start
```bash
# Stop all containers
docker-compose down

# Remove volumes
docker-compose down -v

# Rebuild and restart
docker-compose up --build -d
```

## Next Steps

1. **Explore the API**: Try all endpoints using the Swagger UI
2. **Add More Transactions**: Build up your portfolio
3. **Test WebSocket**: Connect to real-time updates
4. **Run Tests**: `pytest` in the backend directory
5. **Customize**: Modify the code to add features you want!

## Useful Commands

### Docker
```bash
# View logs
docker-compose logs -f backend

# Restart service
docker-compose restart backend

# Access backend shell
docker-compose exec backend bash

# Stop all services
docker-compose down
```

### Database
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres portfolio_tracker

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback migration
docker-compose exec backend alembic downgrade -1
```

### Testing
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_auth.py

# Run specific test
pytest tests/test_auth.py::test_register_user
```

## Demo Data Script

Want to populate some demo data? Run this in the backend directory:

```python
# demo_data.py
import asyncio
from datetime import datetime, timedelta
from app.db.session import AsyncSessionLocal
from app.repositories.user_repository import UserRepository
from app.repositories.portfolio_repository import PortfolioRepository
from app.repositories.transaction_repository import TransactionRepository
from app.models.transaction import TransactionType

async def create_demo_data():
    async with AsyncSessionLocal() as db:
        # Create user
        user_repo = UserRepository(db)
        user = await user_repo.create(
            email="demo@example.com",
            username="demo",
            password="password123"
        )

        # Create portfolio
        portfolio_repo = PortfolioRepository(db)
        portfolio = await portfolio_repo.create(
            name="Demo Tech Portfolio",
            description="Sample technology stocks",
            user_id=user.id
        )

        # Add transactions
        txn_repo = TransactionRepository(db)
        symbols = [
            ("AAPL", 10, 150.00),
            ("GOOGL", 5, 120.00),
            ("MSFT", 15, 300.00),
        ]

        for symbol, qty, price in symbols:
            await txn_repo.create(
                portfolio_id=portfolio.id,
                symbol=symbol,
                transaction_type=TransactionType.BUY,
                quantity=qty,
                price=price,
                fees=0,
                transaction_date=datetime.now() - timedelta(days=30)
            )

        await db.commit()
        print("Demo data created!")

asyncio.run(create_demo_data())
```

Run with:
```bash
python demo_data.py
```

## Getting Help

- Check the main [README.md](../README.md) for detailed documentation
- Review [API_OVERVIEW.md](./API_OVERVIEW.md) for architecture details
- Use the Swagger UI at http://localhost:8000/api/docs for API exploration
- Open an issue on GitHub for bugs or questions

Happy tracking! 📈
