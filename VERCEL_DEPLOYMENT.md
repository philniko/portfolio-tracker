# Deploying Portfolio Tracker with Vercel + Render

## Architecture

- **Frontend**: Vercel (React/Vite)
- **Backend**: Render (FastAPI + Celery)
- **Database**: Render PostgreSQL
- **Cache**: Render Redis

**Total Cost**: Free tier available, then ~$7-25/month

---

## Part 1: Deploy Backend to Render

### 1. Sign up for Render
Visit https://render.com and sign up with GitHub

### 2. Create PostgreSQL Database

1. Click "New +" → "PostgreSQL"
2. Name: `portfolio-tracker-db`
3. Database: `portfolio_tracker`
4. User: `postgres`
5. Region: Choose closest to you
6. Plan: Free or Starter ($7/month)
7. Click "Create Database"
8. **Save the Internal Database URL** (starts with `postgresql://`)

### 3. Create Redis Instance

1. Click "New +" → "Redis"
2. Name: `portfolio-tracker-redis`
3. Region: Same as database
4. Plan: Free (25MB) or Starter ($5/month for 256MB)
5. Click "Create Redis"
6. **Save the Internal Redis URL** (starts with `redis://`)
postgresql://portfolio_tracker_a97k_user:MvNdllydK77f2hTffSUQzLp0HbNzo2IZ@dpg-d46pe62dbo4c739ec670-a/portfolio_tracker_a97k

### 4. Create Backend Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `portfolio-tracker-backend`
   - **Region**: Same as database/redis
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave blank
   - **Runtime**: Docker
   - **Instance Type**: Free or Starter ($7/month)

4. Add Environment Variables (click "Advanced" → "Add Environment Variable"):

```bash
# Database (use Internal URLs from Render)
DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@HOST/portfolio_tracker
DATABASE_URL_SYNC=postgresql://postgres:PASSWORD@HOST/portfolio_tracker

# Redis (use Internal URL from Render)
REDIS_URL=redis://HOST:6379
CELERY_BROKER_URL=redis://HOST:6379/1
CELERY_RESULT_BACKEND=redis://HOST:6379/2

# JWT Authentication
SECRET_KEY=a80b9c8cb319c79aa94e63850acbd56319524adc914032655926f9384b421ede
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI API
OPENAI_API_KEY=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

# Questrade API
QUESTRADE_CLIENT_ID=rBFc4BgHUCTlz79HjhZ2AAsV7_Zyew
QUESTRADE_REFRESH_TOKEN=xW0EcHgIPDhOJXBPGp09N9Jd2UqAwQW80
QUESTRADE_REDIRECT_URI=https://portfolio-tracker-backend.onrender.com/api/v1/questrade/callback

# Application
APP_NAME=Portfolio Tracker
DEBUG=False
CORS_ORIGINS=["https://your-vercel-app.vercel.app"]
FRONTEND_URL=https://your-vercel-app.vercel.app
```

5. Click "Create Web Service"
6. Wait for deployment to complete
7. **Save your backend URL**: `https://portfolio-tracker-backend.onrender.com`

### 5. Create Celery Worker Service

1. Click "New +" → "Background Worker"
2. Connect same repository
3. Configure:
   - **Name**: `portfolio-tracker-celery-worker`
   - **Runtime**: Docker
   - **Docker Command**: `celery -A app.tasks.celery_app worker --loglevel=info`
   - **Instance Type**: Free or Starter

4. Add same environment variables as backend (copy from backend service)

5. Click "Create Background Worker"

### 6. Create Celery Beat Service

1. Click "New +" → "Background Worker"
2. Connect same repository
3. Configure:
   - **Name**: `portfolio-tracker-celery-beat`
   - **Runtime**: Docker
   - **Docker Command**: `celery -A app.tasks.celery_app beat --loglevel=info`
   - **Instance Type**: Free

4. Add same environment variables as backend

5. Click "Create Background Worker"

### 7. Run Database Migrations

1. Go to your backend web service
2. Click "Shell" tab
3. Run:
```bash
cd /app
alembic upgrade head
```

---

## Part 2: Deploy Frontend to Vercel

### 1. Sign up for Vercel
Visit https://vercel.com and sign up with GitHub

### 2. Prepare Frontend

Update `frontend/.env.production`:
```bash
VITE_API_URL=https://portfolio-tracker-backend.onrender.com/api/v1
```

### 3. Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. Add Environment Variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://portfolio-tracker-backend.onrender.com/api/v1`

5. Click "Deploy"
6. Wait for deployment
7. **Save your frontend URL**: `https://your-app.vercel.app`

#### Option B: Via Vercel CLI

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name: portfolio-tracker
# - Directory: ./
# - Override settings? Yes
#   - Build command: npm run build
#   - Output directory: dist
```

### 4. Update CORS Settings

Go back to Render backend service:

1. Click "Environment" tab
2. Update `CORS_ORIGINS`:
```
CORS_ORIGINS=["https://your-actual-app.vercel.app"]
```
3. Update `FRONTEND_URL`:
```
FRONTEND_URL=https://your-actual-app.vercel.app
```
4. Click "Save Changes" (backend will redeploy)

### 5. Update Questrade Redirect URI

1. Go to https://www.questrade.com/api
2. Update your app's redirect URI to:
```
https://portfolio-tracker-backend.onrender.com/api/v1/questrade/callback
```

---

## Part 3: Verification

### Test Backend
```bash
# Health check
curl https://portfolio-tracker-backend.onrender.com/health

# API docs
open https://portfolio-tracker-backend.onrender.com/api/docs
```

### Test Frontend
```bash
# Visit your Vercel app
open https://your-app.vercel.app

# Try:
# 1. Register a user
# 2. Login
# 3. Create a portfolio
# 4. Add a transaction
# 5. Test AI analysis
# 6. Test Questrade integration
```

---

## Automatic Deployments

Both Vercel and Render support automatic deployments:

- **Vercel**: Automatically deploys on every push to `main` branch
- **Render**: Automatically deploys on every push to `main` branch

To disable auto-deploy:
- **Vercel**: Settings → Git → Disable
- **Render**: Settings → Build & Deploy → Auto-Deploy: Off

---

## Custom Domain Setup

### For Frontend (Vercel)

1. Go to project Settings → Domains
2. Add your domain (e.g., `portfolio.yourdomain.com`)
3. Update DNS records as instructed by Vercel
4. Vercel automatically provisions SSL certificate

### For Backend (Render)

1. Go to service Settings → Custom Domains
2. Add your domain (e.g., `api.yourdomain.com`)
3. Update DNS records as instructed by Render
4. Render automatically provisions SSL certificate

Then update:
- Frontend `VITE_API_URL` to `https://api.yourdomain.com/api/v1`
- Backend `CORS_ORIGINS` to `https://portfolio.yourdomain.com`
- Questrade redirect to `https://api.yourdomain.com/api/v1/questrade/callback`

---

## Cost Breakdown

### Free Tier (Perfect for testing/personal use)
- **Vercel**: Free (hobby plan)
- **Render PostgreSQL**: Free (1GB storage)
- **Render Redis**: Free (25MB)
- **Render Web Service**: Free (512MB RAM)
- **Render Workers**: Free (512MB RAM each)
- **Total**: $0/month

**Limitations**:
- Services sleep after 15 minutes of inactivity (30-60s cold start)
- 400 build hours/month
- Limited storage

### Paid Tier (For production use)
- **Vercel Pro**: $20/month (optional, hobby is fine)
- **Render PostgreSQL**: $7/month (256MB RAM, 1GB storage)
- **Render Redis**: $5/month (256MB)
- **Render Web Service**: $7/month (512MB RAM, no sleep)
- **Render Workers**: $7/month each (2 workers = $14)
- **Total**: ~$33/month (without Vercel Pro)

**Benefits**:
- No sleep/cold starts
- Better performance
- More storage
- More RAM

---

## Environment Variables Reference

### Backend (Render)

Required for all 3 services (backend, celery_worker, celery_beat):

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host/db
DATABASE_URL_SYNC=postgresql://user:pass@host/db

# Redis
REDIS_URL=redis://host:6379
CELERY_BROKER_URL=redis://host:6379/1
CELERY_RESULT_BACKEND=redis://host:6379/2

# Security
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# APIs
OPENAI_API_KEY=sk-proj-...
QUESTRADE_CLIENT_ID=...
QUESTRADE_REFRESH_TOKEN=...
QUESTRADE_REDIRECT_URI=https://your-backend.onrender.com/api/v1/questrade/callback

# App Config
APP_NAME=Portfolio Tracker
DEBUG=False
CORS_ORIGINS=["https://your-frontend.vercel.app"]
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (Vercel)

```bash
VITE_API_URL=https://your-backend.onrender.com/api/v1
```

---

## Troubleshooting

### Backend Issues

**Service won't start:**
```bash
# Check logs in Render dashboard
# Common issues:
# - Missing environment variables
# - Database connection failed
# - Wrong DATABASE_URL format
```

**Database connection errors:**
```bash
# Verify DATABASE_URL uses Internal Database URL from Render
# Should start with: postgresql://
# Use postgresql+asyncpg:// for DATABASE_URL
# Use postgresql:// for DATABASE_URL_SYNC
```

**CORS errors:**
```bash
# Verify CORS_ORIGINS matches your Vercel URL exactly
# Include https:// and no trailing slash
# Example: ["https://my-app.vercel.app"]
```

### Frontend Issues

**API calls fail:**
```bash
# Check VITE_API_URL in Vercel environment variables
# Should be: https://your-backend.onrender.com/api/v1
# NOT: /api/v1 (missing domain)
```

**Build fails:**
```bash
# Check build logs in Vercel
# Verify build command: npm run build
# Verify output directory: dist
# Verify root directory: frontend
```

### Cold Start Issues (Free Tier)

Free tier services sleep after 15 minutes:
- First request takes 30-60 seconds (cold start)
- Subsequent requests are fast
- Upgrade to paid tier to eliminate cold starts

---

## Monitoring

### Render
- View logs: Dashboard → Service → Logs
- Metrics: Dashboard → Service → Metrics
- Set up health checks automatically

### Vercel
- View deployments: Dashboard → Project → Deployments
- Analytics: Dashboard → Project → Analytics
- Real-time logs in deployment details

---

## Backup & Recovery

### Database Backups (Render)

Render PostgreSQL automatically backs up daily on paid plans.

Manual backup:
```bash
# From Render Shell
pg_dump $DATABASE_URL > backup.sql
```

### Restore from Backup

```bash
# From Render Shell
psql $DATABASE_URL < backup.sql
```

---

## Alternative: All-in-One Render

If you prefer to avoid Vercel, you can deploy the frontend on Render as a Static Site:

1. Create Static Site on Render
2. Root Directory: `frontend`
3. Build Command: `npm install && npm run build`
4. Publish Directory: `dist`

This keeps everything on one platform but loses some of Vercel's CDN benefits.

---

## You're Ready!

Your Portfolio Tracker can now be deployed with:
- ✅ Vercel for lightning-fast frontend
- ✅ Render for reliable backend
- ✅ Free tier available
- ✅ Automatic deployments from Git
- ✅ SSL certificates included
- ✅ Easy scaling path

Follow the steps above and you'll be live in about 30 minutes! 🚀
