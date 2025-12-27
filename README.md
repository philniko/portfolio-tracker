# Portfolio Tracker

A full-stack, production-ready portfolio tracker built with **FastAPI + React**.
It supports real-time stock data, performance tracking, multi-currency portfolios, Questrade syncing, and AI-powered insights. I built it to behave like something you’d actually rely on for real investing—not just a toy project.

---

## Why I Built This

Most “portfolio tracker” projects stop at CRUD. I wanted to solve something closer to a real-world problem:

* Track multiple portfolios like a real brokerage
* Handle **live stock prices**, caching, websockets
* Support **USD/CAD with forex awareness**
* Compute **true performance metrics + cost basis**
* Sync automatically from **Questrade**
* Provide **useful analytics**, not just lists

So this project is structured like a real production system with background jobs, caching, JWT auth, migrations, async DB, and clean architecture.

---

## Key Features

### 🚀 Core

* **Real-time market data** via Yahoo Finance
* **Multi-currency support (USD & CAD)** with automatic detection & conversion
* **Multiple portfolios per user**
* **Buy / Sell / Dividend tracking**
* **Accurate cost basis & returns**
* **Portfolio allocation & performance**
* **JWT authentication & multi-user support**
* **Questrade integration** for automatic syncing
* **AI portfolio insights** (OpenAI)

---

## 🧠 Architecture & Engineering Highlights

* **Clean Architecture + Repository Pattern** → maintainable & testable codebase
* **FastAPI async stack** → efficient I/O operations
* **Redis caching** → dramatically reduces API latency
* **WebSockets** → live updating dashboards
* **Celery workers** → background price refresh + scheduled jobs
* **Alembic migrations** → real production DB discipline
* **Pytest coverage** → automated testing
* **Dockerized** → reproducible dev/prod environments

This is designed like something that *could* run in production.

---

## 🏗️ Tech Stack

**Backend**
FastAPI • PostgreSQL • SQLAlchemy (async) • Alembic • Redis • Celery
yfinance • Questrade API • JWT • Pytest

**Frontend**
React 18 • TypeScript • Vite • React Router • TanStack Query • Axios

---

## 🗂️ Project Structure

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

---

## ⭐ Performance Targets

* Cached API responses: < 100ms
* Uncached stock fetch: < 500ms
* DB queries: ~50ms avg
* WebSocket latency: < 100ms
* Scales to 1000+ concurrent users per worker

---

## 🔐 Production Considerations

* Secure JWT auth
* Proper CORS handling
* HTTPS
* DB backups + migrations
* Redis clustering + worker scaling
* Load balancer support
* CDN-ready frontend

---

## 🧪 Testing

* Unit + integration tests with Pytest
* Coverage reporting supported

---

## 📈 Future Enhancements

* More data providers (IEX / AlphaVantage)
* Portfolio rebalancing suggestions
* Mobile app (React Native)
* Charts & visualizations
* Tax lot strategies (FIFO / LIFO / Spec ID)
* Alerts / notifications
* Benchmark comparisons
* Export reports (PDF / CSV)
* Optional social/leaderboard features

---

## 📝 License

MIT — free to use, learn from, and build on.

---

## 🤝 Feedback

If you’re curious about implementation details or want to discuss architecture decisions, feel free to reach out or open an issue.

---
