# Portfolio Tracker - Deployment Checklist

## ✅ Security Issues - FIXED!

All critical security issues have been resolved:

- ✅ Removed hardcoded secrets from docker-compose.yml
- ✅ Added frontend/.env to .gitignore
- ✅ Created comprehensive .env.example files
- ✅ Added warnings in .env about regenerating keys for production
- ✅ Verified .env files are NOT tracked in git

## 📋 Pre-Deployment Checklist

### 1. Regenerate All Exposed Secrets (CRITICAL)

```bash
# Generate new JWT secret key
openssl rand -hex 32

# Get new OpenAI API key
# Visit: https://platform.openai.com/api-keys

# Get new Questrade credentials
# Visit: https://www.questrade.com/api
```

### 2. Create Production Environment File

```bash
# Copy example to production
cp .env.example .env.production

# Edit .env.production with:
# - New SECRET_KEY (from step 1)
# - New OPENAI_API_KEY (from step 1)
# - New QUESTRADE credentials (from step 1)
# - Strong database password (not "postgres")
# - DEBUG=False
# - Production CORS_ORIGINS
# - Production QUESTRADE_REDIRECT_URI
```

### 3. Frontend Production Build

```bash
cd frontend

# Create production .env
cp .env.example .env.production

# Set production API URL
echo "VITE_API_URL=https://api.your-domain.com/api/v1" > .env.production

# Build for production
npm install
npm run build

# Output will be in frontend/dist/
```

### 4. Database Setup

```bash
# On production server
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres redis

# Wait for postgres to be ready
docker-compose exec backend alembic upgrade head
```

### 5. SSL Certificates

```bash
# Using Certbot with Docker
docker run -it --rm --name certbot \
  -v "/path/to/nginx/ssl:/etc/letsencrypt" \
  -v "/var/www/certbot:/var/www/certbot" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d your-domain.com \
  -d www.your-domain.com \
  --email your-email@example.com \
  --agree-tos

# Copy certificates to nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
```

### 6. Update nginx.conf

```bash
# Replace placeholders in nginx/nginx.conf
sed -i 's/your-domain.com/actual-domain.com/g' nginx/nginx.conf
```

### 7. Deploy Application

```bash
# Start all services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check logs
docker-compose logs -f backend
docker-compose logs -f celery_worker

# Verify health
curl https://your-domain.com/health
```

## 🔍 Post-Deployment Verification

### Test All Endpoints

```bash
# Health check
curl https://your-domain.com/health

# API docs (should be accessible)
open https://your-domain.com/api/docs

# Frontend
open https://your-domain.com

# Register a test user
curl -X POST https://your-domain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"testpass123"}'

# Login
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### Verify Features

- [ ] User registration and login works
- [ ] JWT authentication working
- [ ] Create portfolio works
- [ ] Add transaction works
- [ ] Stock prices fetch correctly
- [ ] Questrade OAuth flow works (update redirect URI in Questrade console)
- [ ] AI analysis works (verify OpenAI API key)
- [ ] WebSocket connections work
- [ ] Celery tasks execute

## 🔐 Security Checklist

- [ ] DEBUG=False in production
- [ ] Strong database password (not "postgres")
- [ ] All secrets regenerated (not using exposed ones)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] CORS restricted to production domain
- [ ] Firewall configured (only 80, 443 open)
- [ ] Database not exposed to internet
- [ ] Redis not exposed to internet
- [ ] nginx rate limiting active
- [ ] Security headers enabled

## 📊 Monitoring Setup

### Setup Logging

```bash
# Create log directories
mkdir -p /var/log/portfolio_tracker
mkdir -p nginx/logs

# View logs
docker-compose logs -f backend
docker-compose logs -f celery_worker
tail -f nginx/logs/access.log
tail -f nginx/logs/error.log
```

### Setup Backups

```bash
# Automated PostgreSQL backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker exec portfolio_postgres pg_dump -U postgres portfolio_tracker | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz
# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

## 🚀 Deployment Options

### Option 1: VPS (DigitalOcean, Linode, etc.)

1. Create VPS (Ubuntu 22.04 LTS)
2. Install Docker and Docker Compose
3. Clone repository
4. Follow checklist above
5. Setup DNS A records pointing to VPS IP

**Cost**: $5-25/month

### Option 2: Render.com

1. Create Web Service (backend)
2. Create Background Worker (celery_worker, celery_beat)
3. Add PostgreSQL database
4. Add Redis
5. Deploy frontend to Static Site
6. Set environment variables in Render dashboard

**Cost**: $7+ /month (free tier available)

### Option 3: Railway.app

1. Create new project from GitHub
2. Add services: backend, celery_worker, celery_beat
3. Add PostgreSQL and Redis plugins
4. Deploy frontend to Vercel
5. Set environment variables

**Cost**: ~$10+ /month

### Option 4: AWS/GCP/Azure

1. Use ECS/Cloud Run/App Service for containers
2. Managed PostgreSQL (RDS/Cloud SQL/Azure Database)
3. Managed Redis (ElastiCache/Memorystore/Azure Cache)
4. S3/Cloud Storage/Blob for static files
5. CloudFront/Cloud CDN for CDN

**Cost**: ~$50+ /month

## 📝 Maintenance Tasks

### Daily
- Check application logs for errors
- Monitor API response times
- Verify backup completion

### Weekly
- Review database size and performance
- Check disk space
- Review security logs

### Monthly
- Update dependencies
- Apply security patches
- Review and rotate logs
- Test backup restoration

### Quarterly
- Rotate secrets (API keys, tokens)
- Review access logs
- Performance optimization
- Cost optimization

## 🆘 Troubleshooting

### Application won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port already in use
```

### Database connection errors

```bash
# Verify postgres is running
docker-compose ps postgres

# Check connection
docker-compose exec backend python -c "from app.db.session import engine; print('OK')"

# Check DATABASE_URL format
# Should be: postgresql+asyncpg://user:pass@host:port/db
```

### CORS errors

```bash
# Verify CORS_ORIGINS includes your frontend URL
# Should match exactly (including protocol and port)
```

### Questrade OAuth fails

```bash
# Verify redirect URI matches in:
# 1. .env.production QUESTRADE_REDIRECT_URI
# 2. Questrade API console settings
# Both must be identical and use HTTPS in production
```

### AI analysis fails

```bash
# Verify OpenAI API key is valid
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check API credits/limits
```

## 📞 Support Resources

- **Documentation**: See DEPLOYMENT.md for detailed guide
- **API Docs**: https://your-domain.com/api/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Docker Docs**: https://docs.docker.com
- **Let's Encrypt**: https://letsencrypt.org/docs

## ✨ You're Ready!

All security issues have been fixed. The application is now ready for deployment once you:

1. ✅ Regenerate all exposed secrets
2. ✅ Create production .env file
3. ✅ Build frontend
4. ✅ Setup SSL certificates
5. ✅ Deploy to production server

Good luck with your deployment! 🚀
