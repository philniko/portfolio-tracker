# Portfolio Tracker API Overview

## Architecture Overview

This application follows **Clean Architecture** principles with clear separation between layers:

```
┌─────────────────────────────────────────────────────┐
│                   API Layer (FastAPI)                │
│  Route handlers, request/response validation        │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                 Service Layer                        │
│  Business logic, calculations, orchestration        │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              Repository Layer                        │
│  Data access abstraction, database queries          │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                 Model Layer                          │
│  SQLAlchemy models, database entities               │
└─────────────────────────────────────────────────────┘
```

## Key Features

### 1. Authentication & Authorization
- JWT-based authentication
- Secure password hashing with bcrypt
- Token-based API access
- User registration and login
- Protected endpoints with dependency injection

### 2. Portfolio Management
- Create and manage multiple portfolios
- Real-time portfolio valuation
- Automatic cost basis calculation
- Performance metrics (P&L, returns)
- Portfolio allocation tracking
- Questrade account linking and auto-sync

### 3. Transaction Tracking
- Buy/Sell/Dividend transactions
- Automatic holdings synchronization
- Transaction history with pagination
- Cost basis updates using average cost method
- Transaction deletion with holdings recalculation

### 4. Real-Time Stock Data
- Yahoo Finance integration via yfinance
- Redis caching (60-second TTL)
- Batch price fetching
- Current price, volume, market cap, etc.

### 5. Questrade Integration
- User-provided refresh token authentication
- Automatic token refresh via Celery
- Account position syncing
- Dividend and distribution import
- Multiple account support per user
- Background sync with Celery tasks

### 6. AI-Powered Portfolio Analysis
- OpenAI GPT-4o integration
- Comprehensive portfolio analysis
- Stock-specific insights and recommendations
- Risk assessment
- Diversification suggestions
- Market sentiment analysis

### 7. WebSocket Support
- Real-time portfolio updates
- Symbol-based subscriptions
- Live price streaming
- JWT authentication for WebSocket connections

### 8. Background Tasks
- Celery worker for async tasks
- Periodic stock price refresh
- Scheduled cache warming
- Automatic Questrade token refresh
- Celery Beat for task scheduling

## Data Models

### User
```python
- id: Integer (Primary Key)
- email: String (Unique)
- username: String (Unique)
- hashed_password: String
- is_active: Boolean
- created_at: DateTime
- updated_at: DateTime
```

### Portfolio
```python
- id: Integer (Primary Key)
- name: String
- description: String (Optional)
- user_id: Integer (Foreign Key)
- questrade_account_id: String (Optional, links to Questrade account)
- last_questrade_sync: DateTime (Optional, timestamp of last sync)
- created_at: DateTime
- updated_at: DateTime
```

### Holding
```python
- id: Integer (Primary Key)
- portfolio_id: Integer (Foreign Key)
- symbol: String
- quantity: Decimal
- average_cost: Decimal
- total_cost: Decimal
- updated_at: DateTime
```

### Transaction
```python
- id: Integer (Primary Key)
- portfolio_id: Integer (Foreign Key)
- symbol: String
- transaction_type: Enum (BUY, SELL, DIVIDEND)
- quantity: Decimal
- price: Decimal
- total_amount: Decimal
- fees: Decimal
- transaction_date: DateTime
- notes: String (Optional)
- created_at: DateTime
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/me` - Get current user info

### Portfolios
- `GET /api/v1/portfolios` - List user's portfolios with Questrade sync status
- `POST /api/v1/portfolios` - Create new portfolio
- `GET /api/v1/portfolios/{id}` - Get portfolio with real-time data
- `PUT /api/v1/portfolios/{id}` - Update portfolio
- `DELETE /api/v1/portfolios/{id}` - Delete portfolio
- `POST /api/v1/portfolios/{id}/sync-questrade` - Sync Questrade-linked portfolio

### Transactions
- `POST /api/v1/transactions` - Add transaction
- `GET /api/v1/transactions/portfolio/{id}` - Get portfolio transactions
- `GET /api/v1/transactions/{id}` - Get transaction details
- `DELETE /api/v1/transactions/{id}` - Delete transaction

### Stocks
- `GET /api/v1/stocks/{symbol}` - Get stock price
- `POST /api/v1/stocks/batch` - Get multiple stock prices

### WebSocket
- `WS /api/v1/ws/portfolio/{id}` - Real-time portfolio updates

### Questrade Integration
- `GET /api/v1/questrade/status` - Get Questrade connection status
- `POST /api/v1/questrade/connect-with-token` - Connect using user's refresh token
- `POST /api/v1/questrade/refresh-accounts` - Manually refresh account list
- `GET /api/v1/questrade/accounts` - List connected Questrade accounts
- `GET /api/v1/questrade/positions/{account_id}` - Get positions for account
- `GET /api/v1/questrade/balances/{account_id}` - Get account balances
- `GET /api/v1/questrade/activities/{account_id}` - Get account activities
- `POST /api/v1/questrade/sync/{portfolio_id}/{account_id}` - Sync account to portfolio
- `DELETE /api/v1/questrade/disconnect` - Disconnect Questrade account

### AI Advisor
- `POST /api/v1/ai/analyze/{portfolio_id}` - Get AI-powered portfolio analysis

## Business Logic

### Questrade Integration Flow

**1. Connection Setup:**
```
User obtains refresh token from Questrade API Portal →
User enters token in application →
Exchange for access token and API server URL →
Store tokens in database (per-user)
```

**2. Token Management:**
- Access tokens expire after ~30 minutes
- Refresh tokens used to obtain new access tokens automatically
- Celery background task refreshes tokens periodically (before expiry)
- Each user has their own Questrade connection (tokens not shared)

**3. Portfolio Sync:**
```python
1. Fetch positions from Questrade account
2. Create BUY transactions for each position
3. Check for duplicate transactions (skip if exists)
4. Fetch dividends/distributions from last 365 days
5. Create DIVIDEND transactions
6. Update holdings table from all transactions
7. Link portfolio to Questrade account
8. Update last_sync timestamp
```

**4. Sync Features:**
- Deduplication: Prevents importing same positions multiple times
- Dividend Import: Last 365 days of dividends, distributions, interest
- Multiple Transaction Types: DIV, DIVNRA, INT, MFD, DIST, ROC, CGD
- Account Linking: Portfolios remember which account they're synced with
- One-Click Re-sync: Sync button on portfolio page for linked portfolios

### AI Portfolio Analysis

**Input Data:**
- Portfolio holdings with quantities and cost basis
- Current market prices
- Transaction history
- Performance metrics (gains/losses)

**Analysis Components:**
1. **Portfolio Overview**: Composition and diversification
2. **Individual Stock Analysis**: Performance and outlook for each holding
3. **Risk Assessment**: Concentration risk, sector exposure
4. **Recommendations**: Buy/sell/hold suggestions
5. **Market Insights**: Relevant market trends and news

**Model:** OpenAI GPT-4o-mini for cost-effective, fast responses

### Cost Basis Calculation
The application uses the **Average Cost Method**:

```python
def calculate_cost_basis(transactions):
    for each BUY transaction:
        new_quantity = current_quantity + buy_quantity
        new_total_cost = current_total_cost + buy_amount
        average_cost = new_total_cost / new_quantity

    for each SELL transaction:
        new_quantity = current_quantity - sell_quantity
        cost_reduction = average_cost * sell_quantity
        new_total_cost = current_total_cost - cost_reduction

    for each DIVIDEND:
        # Reduces cost basis
        new_total_cost = current_total_cost - dividend_amount
```

### Performance Metrics

**Unrealized Gain/Loss:**
```
unrealized_gain_loss = (current_price * quantity) - total_cost
unrealized_gain_loss_percent = (unrealized_gain_loss / total_cost) * 100
```

**Portfolio Total Value:**
```
total_value = sum(holding.quantity * holding.current_price for all holdings)
total_cost = sum(holding.total_cost for all holdings)
total_gain_loss = total_value - total_cost
total_gain_loss_percent = (total_gain_loss / total_cost) * 100
```

## Caching Strategy

### Redis Cache
- **Stock Prices**: 60-second TTL
- **Cache Key Format**: `stock:{SYMBOL}`
- **Cache Miss Handling**: Fetch from yfinance and cache result

### Benefits
- Reduced API calls to stock data provider
- Improved response times
- Lower rate limit consumption

## Error Handling

Custom exception hierarchy:
```
PortfolioTrackerException (Base)
├── NotFoundException (404)
├── UnauthorizedException (401)
├── ForbiddenException (403)
├── BadRequestException (400)
└── StockDataException (503)
```

All exceptions are caught by global exception handlers and return appropriate HTTP responses.

## Security Best Practices

1. **Password Security**: Bcrypt hashing with salt
2. **JWT Tokens**: Short expiration (30 minutes)
3. **SQL Injection Protection**: SQLAlchemy ORM
4. **CORS Configuration**: Configurable allowed origins
5. **Input Validation**: Pydantic schemas
6. **Authentication Required**: Protected endpoints with dependencies
7. **Environment Variables**: Sensitive data in .env files

## Testing

### Test Coverage
- Authentication tests (register, login, token validation)
- Portfolio CRUD operations
- Transaction management
- Repository layer tests
- Service layer tests

### Test Database
- In-memory SQLite for fast tests
- Isolated test fixtures
- Async test support with pytest-asyncio

## Deployment

### Docker Compose Services
1. **PostgreSQL**: Primary database
2. **Redis**: Cache and message broker
3. **Backend**: FastAPI application
4. **Celery Worker**: Background task processing
5. **Celery Beat**: Task scheduler

### Health Checks
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- API: `/health` endpoint

## Performance Considerations

### Database
- Async SQLAlchemy for non-blocking I/O
- Connection pooling
- Proper indexing on foreign keys and lookup columns
- Query optimization with selectinload for relationships

### API
- Async endpoints throughout
- Response caching for expensive calculations
- Batch operations support
- Connection pooling

### Scalability
- Stateless API design
- Horizontal scaling support
- Redis for shared session state
- Celery for distributed task processing

## Monitoring & Observability

Recommended additions for production:
1. **Logging**: Structured logging with levels
2. **Metrics**: Prometheus integration
3. **Tracing**: OpenTelemetry for distributed tracing
4. **Error Tracking**: Sentry integration
5. **Performance Monitoring**: APM tools

## Future Technical Enhancements

1. **Database**:
   - Read replicas for scaling reads
   - Partitioning for large transaction tables
   - Archival strategy for old data

2. **Caching**:
   - Multi-level caching (Redis + in-memory)
   - Cache invalidation strategies
   - Distributed caching

3. **API**:
   - Rate limiting per user
   - API versioning strategy
   - GraphQL endpoint option
   - gRPC for internal services

4. **Security**:
   - OAuth2 integration
   - Refresh tokens
   - API key management
   - Two-factor authentication

5. **Testing**:
   - Load testing with Locust
   - Contract testing
   - E2E testing with Playwright
   - Mutation testing
