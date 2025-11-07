# Portfolio Tracker - Deployment Guide

## ⚠️ CRITICAL SECURITY ISSUES FOUND

**Your application has EXPOSED SECRETS in `docker-compose.yml` that are tracked by Git!**

### 🚨 Immediate Actions Required

1. **REMOVE SECRETS FROM docker-compose.yml**
   - Your OpenAI API key is exposed in docker-compose.yml (line 55)
   - Your Questrade credentials are exposed (lines 53-54)
   - These files are tracked by git and will be committed

2. **REGENERATE COMPROMISED KEYS**
   - Generate a new OpenAI API key immediately
   - Reset your Questrade refresh token
   - Generate a new SECRET_KEY for JWT tokens

---

## Pre-Deployment Checklist

### 1. Security Configuration

#### A. Fix docker-compose.yml Secrets
Replace hardcoded values with environment variable references:

```yaml
backend:
  environment:
    SECRET_KEY: ${SECRET_KEY}
    OPENAI_API_KEY: ${OPENAI_API_KEY}
    QUESTRADE_CLIENT_ID: ${QUESTRADE_CLIENT_ID}
    QUESTRADE_REFRESH_TOKEN: ${QUESTRADE_REFRESH_TOKEN}
    DEBUG: ${DEBUG:-False}
    CORS_ORIGINS: ${CORS_ORIGINS}
```

#### B. Create Production .env File
Create a `.env.production` file (NOT tracked in git):

```bash
# Database (use strong password)
DATABASE_URL=postgresql+asyncpg://postgres:STRONG_PASSWORD_HERE@postgres:5432/portfolio_tracker
DATABASE_URL_SYNC=postgresql://postgres:STRONG_PASSWORD_HERE@postgres:5432/portfolio_tracker

# JWT Authentication (generate new key)
SECRET_KEY=<run: openssl rand -hex 32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis
REDIS_URL=redis://redis:6379/0

# OpenAI API (NEW KEY - old one is compromised)
OPENAI_API_KEY=<your-new-openai-api-key>

# Questrade API (NEW CREDENTIALS)
QUESTRADE_CLIENT_ID=<your-questrade-client-id>
QUESTRADE_REFRESH_TOKEN=<your-new-questrade-refresh-token>
QUESTRADE_REDIRECT_URI=https://your-domain.com/api/v1/questrade/callback

# Application
APP_NAME=Portfolio Tracker
DEBUG=False
CORS_ORIGINS=["https://your-frontend-domain.com"]
FRONTEND_URL=https://your-frontend-domain.com

# Celery
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2
```

#### C. Update Frontend Configuration
Create `frontend/.env.production`:

```bash
VITE_API_URL=https://your-api-domain.com/api/v1
```

### 2. Code Changes Required

#### A. Update CORS Settings
In `backend/app/main.py`, ensure production URLs are in CORS_ORIGINS:
```python
# In production .env:
CORS_ORIGINS=["https://your-domain.com","https://www.your-domain.com"]
```

#### B. Disable Debug Mode
```bash
DEBUG=False  # in production .env
```

#### C. Update Questrade Redirect URI
Update both:
- Production `.env` file
- Questrade API application settings at questrade.com

### 3. Database Setup

```bash
# Run migrations on production database
docker-compose exec backend alembic upgrade head
```

### 4. Frontend Build

```bash
cd frontend
npm install
npm run build  # Creates optimized production build in dist/
```

Serve the `dist/` folder with nginx, Caddy, or a static hosting service.

### 5. .gitignore Verification

Ensure these are in `.gitignore`:
```
.env
.env.*
!.env.example
docker-compose.override.yml
frontend/.env
frontend/.env.*
!frontend/.env.example
```

---

## Deployment Options

### Option 1: Docker Compose (Recommended for VPS)

1. **Setup server** (Ubuntu/Debian):
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin
```

2. **Clone and configure**:
```bash
git clone <your-repo>
cd portfolio_tracker
cp .env.example .env.production
# Edit .env.production with production values
```

3. **Update docker-compose.yml for production**:
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    restart: always
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - /var/lib/postgresql/data:/var/lib/postgresql/data

  redis:
    restart: always

  backend:
    restart: always
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    env_file: .env.production

  celery_worker:
    restart: always
    env_file: .env.production

  celery_beat:
    restart: always
    env_file: .env.production

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/dist:/usr/share/nginx/html
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - backend
```

4. **Start services**:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Option 2: Cloud Platforms

#### Render.com
- Deploy backend as Web Service
- Deploy Celery as Background Worker
- Use Render PostgreSQL and Redis add-ons
- Deploy frontend as Static Site

#### Railway.app
- Create services for: backend, celery_worker, celery_beat
- Add PostgreSQL and Redis plugins
- Deploy frontend to Vercel/Netlify

#### DigitalOcean App Platform
- Create app from GitHub
- Add backend, worker, database, and static site components

---

## Post-Deployment Steps

### 1. SSL/TLS Certificates
```bash
# Using Certbot with nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 2. Database Backups
```bash
# Setup automated PostgreSQL backups
docker exec portfolio_postgres pg_dump -U postgres portfolio_tracker > backup.sql
```

### 3. Monitoring Setup
- Setup application monitoring (Sentry, DataDog, etc.)
- Configure log aggregation
- Setup uptime monitoring (UptimeRobot, etc.)

### 4. Environment Health Check
```bash
# Test health endpoint
curl https://your-domain.com/health

# Test API
curl https://your-domain.com/api/docs
```

---

## Security Best Practices

### Must Do:
1. ✅ Use HTTPS everywhere (Let's Encrypt)
2. ✅ Set DEBUG=False in production
3. ✅ Use strong, unique passwords for database
4. ✅ Regenerate all exposed API keys
5. ✅ Restrict CORS to your domain only
6. ✅ Use environment variables for all secrets
7. ✅ Enable firewall (ufw/iptables)
8. ✅ Regular security updates
9. ✅ Database backups (automated)
10. ✅ Rate limiting on API endpoints

### Recommended:
- Use a reverse proxy (nginx/Caddy)
- Implement rate limiting
- Add security headers (helmet)
- Setup monitoring and alerting
- Use a secrets manager (AWS Secrets Manager, Vault)
- Implement database connection pooling
- Setup CDN for static assets
- Enable database encryption at rest

---

## Performance Optimization

### Backend:
```python
# Increase workers in production
uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000
```

### Database:
- Add indexes on frequently queried columns
- Setup read replicas for scaling
- Configure connection pooling

### Redis:
- Configure persistence (AOF or RDB)
- Set maxmemory policy
- Monitor memory usage

### Frontend:
- Enable gzip compression in nginx
- Setup CDN (CloudFlare, AWS CloudFront)
- Implement code splitting
- Optimize images

---

## Scaling Considerations

### Horizontal Scaling:
- Use load balancer (nginx, HAProxy)
- Deploy multiple backend instances
- Use managed PostgreSQL (AWS RDS, etc.)
- Use managed Redis (AWS ElastiCache, etc.)

### Monitoring Metrics:
- API response times
- Error rates
- Database connection pool usage
- Redis memory usage
- Celery queue lengths
- Stock API rate limit usage

---

## Rollback Plan

Keep previous Docker images:
```bash
# Tag current version before deploying
docker tag portfolio_tracker-backend:latest portfolio_tracker-backend:v1.0.0

# Rollback if needed
docker-compose down
docker tag portfolio_tracker-backend:v1.0.0 portfolio_tracker-backend:latest
docker-compose up -d
```

---

## Support & Maintenance

### Regular Tasks:
- **Daily**: Monitor error logs, check API health
- **Weekly**: Review database backups, check disk space
- **Monthly**: Update dependencies, security patches
- **Quarterly**: Review and rotate secrets

### Log Locations:
```bash
# Docker logs
docker-compose logs backend
docker-compose logs celery_worker

# Application logs (if configured)
tail -f /var/log/portfolio_tracker/app.log
```

---

## ⚠️ CRITICAL: Before Git Commit

```bash
# 1. Fix docker-compose.yml to remove secrets
# 2. Add frontend/.env to .gitignore
# 3. Check no secrets are committed:
git diff
git status

# 4. Make sure .env is not tracked:
git rm --cached .env
git rm --cached frontend/.env

# 5. Commit your changes
git add .
git commit -m "Prepare for deployment - remove hardcoded secrets"
```

---

## Cost Estimates

### Small Deployment (1-100 users):
- VPS: $5-20/month (DigitalOcean, Linode)
- Domain: $10-15/year
- SSL: Free (Let's Encrypt)
- **Total**: ~$10-25/month

### Medium Deployment (100-1000 users):
- Managed hosting: $50-100/month
- Managed DB: $15-50/month
- CDN: $5-20/month
- **Total**: ~$70-170/month

---

## Need Help?

Common deployment issues:
1. **CORS errors**: Check CORS_ORIGINS in .env matches frontend URL
2. **Database connection failed**: Verify DATABASE_URL and container networking
3. **Questrade OAuth fails**: Update redirect URI in both .env and Questrade console
4. **OpenAI errors**: Verify API key is valid and has credits

Check `/api/docs` for API health and endpoint testing.
