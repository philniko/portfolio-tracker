# Portfolio Tracker

A production-grade, full-stack portfolio tracking application built with FastAPI and React. Track your investments, monitor real-time stock prices, calculate returns, cost basis, and portfolio allocation with enterprise-level architecture and features.

## Features

### Core Functionality
- **Real-Time Stock Data**: Integration with Yahoo Finance for live market data
- **Multi-Currency Support**: Track USD and CAD stocks with automatic currency detection and conversion
- **Portfolio Management**: Create and manage multiple investment portfolios with cash balance tracking
- **Transaction Tracking**: Record buy, sell, and dividend transactions with currency support
- **Cost Basis Calculation**: Automatic calculation using average cost method
- **Performance Metrics**: Real-time P&L, returns, and allocation tracking in CAD
- **Multi-User Support**: JWT-based authentication and user management
- **Questrade Integration**: Automatic portfolio, cash balance, and dividend syncing with exact forex rates
- **AI-Powered Analysis**: GPT-4o-mini portfolio insights and investment recommendations

### Advanced Features
- **Clean Architecture**: Separation of concerns with repository pattern
- **Caching Layer**: Redis caching for optimized stock data fetching
- **WebSocket Support**: Real-time portfolio updates
- **Background Tasks**: Celery for periodic data refresh
- **Database Migrations**: Alembic for version-controlled schema management
- **Comprehensive Testing**: Unit and integration tests with pytest
- **API Documentation**: Auto-generated OpenAPI/Swagger docs
- **Docker Support**: Full containerization with docker-compose

## Tech Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **PostgreSQL**: Production-grade relational database
- **SQLAlchemy**: Async ORM for database operations
- **Alembic**: Database migration management
- **Redis**: Caching and message broker
- **Celery**: Distributed task queue for background jobs
- **yfinance**: Real-time stock market data
- **OpenAI GPT-4o-mini**: AI-powered portfolio analysis
- **Questrade API**: Brokerage account integration
- **JWT**: Secure authentication
- **pytest**: Testing framework

### Frontend
- **React 18**: Modern UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **React Router**: Client-side routing
- **TanStack Query**: Data fetching and caching
- **Axios**: HTTP client

## Project Structure

```
portfolio_tracker/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py          # Authentication endpoints
│   │   │   │   ├── portfolios.py    # Portfolio management
│   │   │   │   ├── transactions.py  # Transaction operations
│   │   │   │   ├── stocks.py        # Stock data endpoints
│   │   │   │   └── websocket.py     # Real-time updates
│   │   │   └── dependencies.py      # Shared dependencies
│   │   ├── core/
│   │   │   ├── config.py            # Application settings
│   │   │   ├── security.py          # JWT & password hashing
│   │   │   └── exceptions.py        # Custom exceptions
│   │   ├── db/
│   │   │   └── session.py           # Database configuration
│   │   ├── models/                  # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── portfolio.py
│   │   │   └── transaction.py
│   │   ├── repositories/            # Data access layer
│   │   │   ├── user_repository.py
│   │   │   ├── portfolio_repository.py
│   │   │   └── transaction_repository.py
│   │   ├── schemas/                 # Pydantic schemas
│   │   │   ├── user.py
│   │   │   ├── portfolio.py
│   │   │   └── transaction.py
│   │   ├── services/                # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── portfolio_service.py
│   │   │   └── stock_service.py
│   │   ├── tasks/                   # Celery tasks
│   │   │   ├── celery_app.py
│   │   │   └── stock_tasks.py
│   │   └── main.py                  # Application entry point
│   ├── alembic/                     # Database migrations
│   ├── tests/                       # Test suite
│   ├── requirements.txt             # Python dependencies
│   └── alembic.ini                  # Alembic configuration
├── frontend/
│   ├── src/
│   │   ├── components/              # Reusable components
│   │   ├── pages/                   # Page components
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── PortfolioDetail.tsx
│   │   ├── services/
│   │   │   └── api.ts               # API client
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx      # Auth state management
│   │   ├── hooks/                   # Custom React hooks
│   │   └── App.tsx                  # Main app component
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml               # Multi-container orchestration
├── Dockerfile                       # Backend container
├── .env.example                     # Environment variables template
└── README.md

```

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Option 1: Docker Setup (Recommended)

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd portfolio_tracker
```

2. **Create environment file**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Start all services**
```bash
docker-compose up -d
```

4. **Run database migrations**
```bash
docker-compose exec backend alembic upgrade head
```

5. **Access the application**
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs
- Frontend: http://localhost:3000 (after setting up frontend separately)

### Option 2: Local Development Setup

#### Backend Setup

1. **Create virtual environment**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Set up PostgreSQL database**
```bash
createdb portfolio_tracker
```

4. **Configure environment**
```bash
cp ../.env.example ../.env
# Edit .env with your database credentials
```

5. **Run migrations**
```bash
alembic upgrade head
```

6. **Start Redis**
```bash
redis-server
```

7. **Start Celery worker (in a new terminal)**
```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

8. **Start Celery beat (in another terminal)**
```bash
celery -A app.tasks.celery_app beat --loglevel=info
```

9. **Run the backend server**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**
```bash
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env
```

4. **Start development server**
```bash
npm run dev
```

5. **Access the frontend**
Open http://localhost:5173 in your browser

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### Portfolio Endpoints

#### Create Portfolio
```http
POST /api/v1/portfolios
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Portfolio",
  "description": "Long-term investments"
}
```

#### List Portfolios
```http
GET /api/v1/portfolios
Authorization: Bearer <token>
```

#### Get Portfolio Details
```http
GET /api/v1/portfolios/{portfolio_id}
Authorization: Bearer <token>
```

### Transaction Endpoints

#### Add Transaction
```http
POST /api/v1/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "portfolio_id": 1,
  "symbol": "AAPL",
  "transaction_type": "BUY",
  "quantity": 10,
  "price": 150.50,
  "currency": "USD",
  "fees": 0.99,
  "transaction_date": "2024-01-15T10:30:00Z",
  "notes": "Initial purchase"
}
```

**Note**: Currency is auto-detected from stock data if not specified. Supports `CAD` and `USD`.

#### Get Portfolio Transactions
```http
GET /api/v1/transactions/portfolio/{portfolio_id}
Authorization: Bearer <token>
```

### Stock Data Endpoints

#### Get Stock Price
```http
GET /api/v1/stocks/AAPL
Authorization: Bearer <token>
```

#### Get Multiple Stock Prices
```http
POST /api/v1/stocks/batch
Authorization: Bearer <token>
Content-Type: application/json

["AAPL", "GOOGL", "MSFT"]
```

### WebSocket

#### Real-Time Portfolio Updates
```javascript
const ws = new WebSocket(
  'ws://localhost:8000/api/v1/ws/portfolio/1?token=YOUR_JWT_TOKEN'
);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Portfolio update:', data);
};

// Subscribe to symbols
ws.send(JSON.stringify({
  action: 'subscribe_symbols',
  symbols: ['AAPL', 'GOOGL']
}));
```

## Testing

### Run Backend Tests
```bash
cd backend
pytest
```

### Run with coverage
```bash
pytest --cov=app --cov-report=html
```

### Run specific test file
```bash
pytest tests/test_auth.py
```

## Database Migrations

### Create a new migration
```bash
alembic revision --autogenerate -m "Description of changes"
```

### Apply migrations
```bash
alembic upgrade head
```

### Rollback migration
```bash
alembic downgrade -1
```

## Architecture Highlights

### Clean Architecture
The application follows clean architecture principles with clear separation of concerns:

- **API Layer**: FastAPI route handlers
- **Service Layer**: Business logic and calculations
- **Repository Layer**: Data access abstraction
- **Model Layer**: Database entities

### Key Design Patterns
- **Repository Pattern**: Abstracts data access logic
- **Dependency Injection**: Used throughout with FastAPI's Depends
- **Factory Pattern**: Database session management
- **Observer Pattern**: WebSocket real-time updates

### Performance Optimizations
- **Redis Caching**: Stock price data cached for 1 minute
- **Async Operations**: All database and I/O operations are async
- **Connection Pooling**: PostgreSQL connection pool
- **Background Tasks**: Heavy operations run via Celery

## Production Deployment

### Environment Variables
Key environment variables for production:

```env
# Security
SECRET_KEY=<generate-with-openssl-rand-hex-32>
DEBUG=False

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
DATABASE_URL_SYNC=postgresql://user:pass@host:5432/dbname

# Redis
REDIS_URL=redis://redis:6379/0

# CORS
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]

# OpenAI (for AI portfolio analysis)
OPENAI_API_KEY=sk-your-openai-api-key
```

### Security Checklist
- [ ] Change default SECRET_KEY
- [ ] Set DEBUG=False
- [ ] Configure proper CORS origins
- [ ] Use HTTPS in production
- [ ] Enable PostgreSQL SSL connections
- [ ] Set up proper firewall rules
- [ ] Regular database backups
- [ ] Monitor application logs
- [ ] Set up rate limiting
- [ ] Use environment-specific .env files

### Scaling Considerations
- Horizontal scaling of FastAPI workers
- Redis cluster for caching
- PostgreSQL read replicas
- Celery worker pool scaling
- CDN for frontend static assets
- Load balancer configuration

## Performance Metrics

The application is designed for:
- **API Response Time**: < 100ms (cached), < 500ms (uncached)
- **Database Query Time**: < 50ms average
- **WebSocket Latency**: < 100ms
- **Concurrent Users**: 1000+ (per worker)

## Contributing

This is a portfolio project, but suggestions and feedback are welcome!

## License

MIT License - feel free to use this project for learning and portfolio purposes.

## Future Enhancements

- [x] ~~Add dividend tracking and reinvestment calculations~~ (Completed via Questrade integration)
- [x] ~~AI-powered portfolio analysis~~ (Completed with OpenAI GPT-4o-mini)
- [ ] Add more stock data providers (Alpha Vantage, IEX Cloud)
- [ ] Implement portfolio rebalancing recommendations
- [ ] Create mobile app (React Native)
- [ ] Add data visualization (charts, graphs)
- [ ] Implement tax lot tracking (FIFO, LIFO, specific ID)
- [ ] Add alerts and notifications
- [ ] Portfolio benchmarking against indices
- [ ] Export functionality (PDF reports, CSV)
- [ ] Social features (share portfolios, leaderboards)

## Contact

For questions or feedback about this project, please open an issue on GitHub.

---

**Built with modern best practices for a production-ready, enterprise-grade application.**
