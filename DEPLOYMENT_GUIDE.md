# OutfitAI - Deployment Guide

## Production Deployment Steps

### Phase 1: Backend Deployment (FastAPI)

#### Option A: Deploy to Heroku (Free Tier)

1. **Install Heroku CLI**
   ```bash
   brew tap heroku/brew && brew install heroku
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   cd backend
   heroku create outfit-ai-api
   ```

4. **Create Procfile**
   ```bash
   echo "web: uvicorn main:app --host 0.0.0.0 --port \$PORT" > Procfile
   ```

5. **Set Environment Variables**
   ```bash
   heroku config:set OPENAI_API_KEY=sk-your-key-here
   heroku config:set SECRET_KEY=your-production-secret-key
   heroku config:set DATABASE_URL=postgresql://...  # If using PostgreSQL
   ```

6. **Deploy**
   ```bash
   git push heroku main
   ```

#### Option B: Deploy to AWS (Recommended)

1. **Create EC2 Instance**
   - Ubuntu 22.04 LTS
   - t2.micro or t3.micro (free tier eligible)
   - Open ports: 80, 443, 8000

2. **SSH into Instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   ```

3. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install python3-pip python3-venv postgresql nginx
   ```

4. **Clone Repository**
   ```bash
   git clone your-repo-url
   cd OutfitAI/backend
   ```

5. **Setup Virtual Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

6. **Setup PostgreSQL Database**
   ```bash
   sudo -u postgres createdb outfit_ai
   # Update DATABASE_URL in .env
   ```

7. **Run Migrations** (if using Alembic)
   ```bash
   alembic upgrade head
   ```

8. **Configure Gunicorn**
   ```bash
   pip install gunicorn
   gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

9. **Setup Systemd Service**
   ```bash
   sudo nano /etc/systemd/system/outfit-ai.service
   ```

   ```ini
   [Unit]
   Description=OutfitAI API
   After=network.target

   [Service]
   Type=notify
   User=ubuntu
   WorkingDirectory=/home/ubuntu/OutfitAI/backend
   Environment="PATH=/home/ubuntu/OutfitAI/backend/venv/bin"
   ExecStart=/home/ubuntu/OutfitAI/backend/venv/bin/gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable outfit-ai
   sudo systemctl start outfit-ai
   ```

10. **Configure Nginx Reverse Proxy**
    ```bash
    sudo nano /etc/nginx/sites-available/outfit-ai
    ```

    ```nginx
    server {
        listen 80;
        server_name your-domain.com;

        location / {
            proxy_pass http://127.0.0.1:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /uploads {
            alias /home/ubuntu/OutfitAI/backend/uploads;
        }
    }
    ```

    ```bash
    sudo ln -s /etc/nginx/sites-available/outfit-ai /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

11. **Setup SSL with Let's Encrypt**
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

#### Option C: Deploy to Google Cloud Run

1. **Install Google Cloud CLI**
   ```bash
   curl https://sdk.cloud.google.com | bash
   gcloud init
   ```

2. **Create Dockerfile**
   ```dockerfile
   FROM python:3.9-slim

   WORKDIR /app

   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt

   COPY . .

   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
   ```

3. **Deploy**
   ```bash
   gcloud run deploy outfit-ai-api --source . --platform managed --region us-central1
   ```

---

### Phase 2: Mobile App Deployment

#### iOS App Store

1. **Create Apple Developer Account**
   - Cost: $99/year
   - Visit: developer.apple.com

2. **Setup App in App Store Connect**
   - Create new app
   - Configure bundle identifier
   - Generate signing certificates

3. **Build for iOS**
   ```bash
   cd mobile
   eas build --platform ios
   ```

4. **Submit for Review**
   - Prepare screenshots and description
   - Submit via App Store Connect
   - Wait for Apple review (1-3 days)

#### Google Play Store

1. **Create Google Play Developer Account**
   - Cost: $25 (one-time)
   - Visit: play.google.com/console

2. **Setup App in Play Console**
   - Create new app
   - Configure bundle identifier

3. **Build for Android**
   ```bash
   cd mobile
   eas build --platform android
   ```

4. **Submit for Review**
   - Prepare screenshots and description
   - Submit via Play Console
   - Usually approved within 24 hours

#### Build for Both Platforms
```bash
cd mobile
eas build --platform all
```

---

### Phase 3: Database Migration

#### From SQLite to PostgreSQL

1. **Create PostgreSQL Database**
   ```bash
   createdb outfit_ai
   ```

2. **Update DATABASE_URL in .env**
   ```
   DATABASE_URL=postgresql://user:password@localhost/outfit_ai
   ```

3. **Reinstall PostgreSQL Adapter**
   ```bash
   pip install psycopg2-binary
   ```

4. **Create Tables**
   ```bash
   python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
   ```

5. **Migrate Data** (if needed)
   ```python
   from sqlalchemy import create_engine, MetaData, Table, select
   from sqlalchemy.orm import sessionmaker

   # Export from SQLite
   sqlite_engine = create_engine('sqlite:///./test.db')
   # ... load and transform data ...

   # Import to PostgreSQL
   postgres_engine = create_engine('postgresql://...')
   # ... insert transformed data ...
   ```

---

### Phase 4: Environment Configuration

#### Production .env
```
# Database
DATABASE_URL=postgresql://user:password@hostname:5432/outfit_ai

# Security
SECRET_KEY=generate-a-long-random-string-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI
OPENAI_API_KEY=sk-your-production-key-here

# API
API_BASE_URL=https://your-domain.com/api

# Storage
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET=outfit-ai-images
```

#### Mobile Config
Update `mobile/src/api/config.js`:
```javascript
const API_BASE_URL = "https://your-domain.com/api";
```

---

### Phase 5: Monitoring & Maintenance

#### Setup Logging
```bash
pip install python-json-logger
```

#### Setup Error Tracking (Sentry)
```bash
pip install sentry-sdk
```

Add to `main.py`:
```python
import sentry_sdk

sentry_sdk.init(
    dsn="https://your-sentry-dsn",
    traces_sample_rate=1.0
)
```

#### Setup Performance Monitoring (New Relic)
```bash
pip install newrelic
```

#### Database Backups
```bash
# Daily PostgreSQL backup
0 2 * * * pg_dump outfit_ai > /backups/outfit_ai_$(date +\%Y\%m\%d).sql

# S3 upload
aws s3 sync /backups s3://outfit-ai-backups/
```

---

### Phase 6: CI/CD Pipeline

#### GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Run tests
        run: |
          cd backend
          pytest
      
      - name: Deploy to production
        run: |
          # Deploy script here
          echo "Deploying..."
```

---

### Phase 7: Security Checklist

- [ ] Change default SECRET_KEY
- [ ] Set strong database password
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly (restrict origins)
- [ ] Setup rate limiting
- [ ] Enable database encryption
- [ ] Configure backup and recovery
- [ ] Setup monitoring and alerts
- [ ] Enable API key rotation
- [ ] Configure password policies
- [ ] Setup two-factor authentication (optional)
- [ ] Regular security audits

---

### Phase 8: Performance Optimization

#### Database
```python
# Add indexes to frequently queried columns
from sqlalchemy import Index

Index('idx_user_id_created_at', ClothingItem.user_id, ClothingItem.created_at)
```

#### Caching
```bash
pip install redis
pip install fastapi-cache2
```

#### CDN for Images
```
Upload images to CloudFront/Cloudflare
Serve from CDN instead of direct S3
```

#### API Optimization
```python
# Pagination
from fastapi import Query

@router.get("/items")
def get_items(skip: int = Query(0), limit: int = Query(10)):
    return db.query(ClothingItem).offset(skip).limit(limit).all()
```

---

### Phase 9: Scaling Strategy

1. **Load Balancing**
   - Use AWS ELB or Nginx
   - Multiple FastAPI instances

2. **Database Scaling**
   - Read replicas for read-heavy operations
   - Connection pooling (pgbouncer)

3. **Image Storage**
   - Migrate to S3/CloudFront
   - Enable image compression

4. **API Caching**
   - Redis for frequent queries
   - HTTP caching headers

---

## Deployment Checklist

- [ ] Backend API deployed
- [ ] Database configured (PostgreSQL)
- [ ] Environment variables set
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Database backups scheduled
- [ ] Monitoring setup
- [ ] iOS app submitted to App Store
- [ ] Android app submitted to Play Store
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Support channels setup (email, chat)

---

## Post-Deployment

### Monitor Performance
```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/health
```

### Update Mobile Apps
- Monitor crash reports
- Gather user feedback
- Plan updates
- Submit to stores

### Regular Maintenance
- Weekly backups
- Monthly security updates
- Quarterly performance reviews
- Bi-annual security audits

---

## Cost Estimation

| Service | Free Tier | Paid |
|---------|-----------|------|
| AWS EC2 | 750 hrs/month | $10-50/month |
| RDS PostgreSQL | - | $15-50/month |
| S3 Storage | 5 GB | $0.023/GB |
| OpenAI API | - | Usage-based (~$5-50/month) |
| Domain | - | $10-15/year |
| SSL Certificate | Free (Let's Encrypt) | Free |
| **Total** | **~$0** | **~$50-150/month** |

---

**Happy deploying! 🚀**
