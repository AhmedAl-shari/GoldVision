# GoldVision Project - Setup & Running Guide

## Prerequisites

Before running the project, ensure you have the following installed:

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **Git** (optional, if cloning from repository)

### Verify Docker Installation

```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker compose version
```

---

## Quick Start (Recommended Method)

### Step 1: Navigate to Project Directory

```bash
cd goldvision
```

### Step 2: Start All Services with Docker Compose

For **development environment** (recommended for testing):

```bash
docker compose -f docker-compose.dev.yaml up -d
```

For **production environment**:

```bash
docker compose up -d
```

This command will:

- ✅ Pull required Docker images (PostgreSQL, Redis, etc.)
- ✅ Build application images (Backend, Frontend, Prophet service)
- ✅ Start all services in the background
- ✅ Set up database connections automatically

### Step 3: Wait for Services to Start

Wait approximately 30-60 seconds for all services to initialize. You can check the status:

```bash
# Check service status
docker compose -f docker-compose.dev.yaml ps
```

All services should show status as "Up" or "healthy".

### Step 4: Access the Application

Once all services are running, access the application at:

| Service               | URL                          | Description            |
| --------------------- | ---------------------------- | ---------------------- |
| **Frontend**          | http://localhost:3000        | Main web application   |
| **Backend API**       | http://localhost:8000        | REST API server        |
| **API Documentation** | http://localhost:8000/docs   | Swagger UI             |
| **Health Check**      | http://localhost:8000/health | Service health status  |
| **Prophet Service**   | http://localhost:8001        | ML forecasting service |
| **pgAdmin**           | http://localhost:5050        | Database management UI |

---

## 📦 Restoring Dependencies (If Needed)

If you received the project without `node_modules` or `venv` directories, don't worry! These are automatically handled by Docker.

### Using Docker (Recommended - No Manual Steps Required)

**Docker automatically installs all dependencies inside containers.** When you run:

```bash
docker compose -f docker-compose.dev.yaml up -d
```

Docker will:

- ✅ Install Node.js dependencies (`node_modules`) inside the frontend and backend containers
- ✅ Install Python dependencies inside the prophet service container
- ✅ Set up the database and all required services

**You don't need to manually install anything!** Just run the Docker command above.

### Manual Installation (Only if Not Using Docker)

If you prefer to run the project without Docker, you'll need to restore dependencies manually:

#### Node.js Dependencies

```bash
# Navigate to project root
cd goldvision

# Install root dependencies
npm install --legacy-peer-deps

# Install frontend dependencies
cd frontend
npm install --legacy-peer-deps
cd ..
```

**Note:** The `--legacy-peer-deps` flag is required due to React version compatibility.

#### Python Dependencies

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install Python dependencies
cd prophet-service
pip install -r requirements.txt
cd ..
```

### What About Other Excluded Files?

The following files/directories are excluded from the source code but are **not needed** to run the project:

- `artifacts/` - Generated during runtime/testing
- `frontend/test-results/` - Generated when running tests
- `frontend/playwright-report/` - Generated when running tests
- `.git/` - Version control history (not needed for running)

These will be automatically created when needed during development or testing.

---

## 🗄️ Connecting to PostgreSQL Database

The project uses PostgreSQL 15 as the database. There are multiple ways to connect:

### Method 1: Using pgAdmin (Web Interface) - Easiest

1. **Access pgAdmin:**

   - Open browser: http://localhost:5050
   - **Email:** `admin@goldvision.com`
   - **Password:** `admin` (or value from `PGADMIN_PASSWORD` env variable)

2. **Add PostgreSQL Server:**

   - Right-click "Servers" → "Register" → "Server"
   - **General Tab:**
     - Name: `GoldVision Database`
   - **Connection Tab:**
     - Host: `postgres` (or `goldvision-postgres-dev` for dev)
     - Port: `5432`
     - Maintenance database: `goldvision`
     - Username: `goldvision`
     - Password: `changeme` (or value from `POSTGRES_PASSWORD` env variable)
   - Click "Save"

3. **Browse Database:**
   - Expand "GoldVision Database" → "Databases" → "goldvision" → "Schemas" → "public" → "Tables"

### Method 2: Using psql (Command Line)

#### Option A: Connect from Host Machine

```bash
# Connect to PostgreSQL (port 5433 is mapped from container)
psql -h localhost -p 5433 -U goldvision -d goldvision

# When prompted, enter password: changeme
```

#### Option B: Connect from Inside Container

```bash
# Execute psql inside the PostgreSQL container
docker compose -f docker-compose.dev.yaml exec postgres psql -U goldvision -d goldvision
```

### Method 3: Using Database Connection String

The application uses this connection string internally:

```
postgresql://goldvision:changeme@postgres:5432/goldvision
```

**Connection Details:**

- **Host:** `postgres` (inside Docker network) or `localhost` (from host)
- **Port:** `5432` (inside Docker) or `5433` (from host machine)
- **Database:** `goldvision`
- **Username:** `goldvision`
- **Password:** `changeme` (default, can be changed via environment variable)

### Method 4: Using Database GUI Tools

You can use any PostgreSQL client (DBeaver, TablePlus, DataGrip, etc.) with these settings:

- **Host:** `localhost`
- **Port:** `5433`
- **Database:** `goldvision`
- **Username:** `goldvision`
- **Password:** `changeme`

---

## Database Schema & Migrations

The project uses Prisma ORM for database management. Migrations are automatically applied when the backend service starts.

### View Database Schema

```bash
# View Prisma schema
cat prisma/schema.prisma
```

### Manual Migration (if needed)

```bash
# Run migrations manually
docker compose -f docker-compose.dev.yaml exec backend npx prisma migrate deploy

# Generate Prisma client
docker compose -f docker-compose.dev.yaml exec backend npx prisma generate
```

### Access Prisma Studio (Database GUI)

```bash
# Open Prisma Studio in browser
docker compose -f docker-compose.dev.yaml exec backend npx prisma studio
```

Then access at: http://localhost:5555

---

## Useful Docker Commands

### View Service Logs

```bash
# View all service logs
docker compose -f docker-compose.dev.yaml logs -f

# View specific service logs
docker compose -f docker-compose.dev.yaml logs -f backend
docker compose -f docker-compose.dev.yaml logs -f frontend
docker compose -f docker-compose.dev.yaml logs -f postgres
```

### Check Service Status

```bash
# List all running containers
docker compose -f docker-compose.dev.yaml ps

# Check service health
docker compose -f docker-compose.dev.yaml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### Stop Services

```bash
# Stop all services
docker compose -f docker-compose.dev.yaml down

# Stop and remove volumes (⚠️ deletes database data)
docker compose -f docker-compose.dev.yaml down -v
```

### Restart Services

```bash
# Restart all services
docker compose -f docker-compose.dev.yaml restart

# Restart specific service
docker compose -f docker-compose.dev.yaml restart backend
```

### Rebuild Services (after code changes)

```bash
# Rebuild and restart
docker compose -f docker-compose.dev.yaml up -d --build
```

---

## Verify Installation

### 1. Check Backend Health

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2025-01-XX...",
  "version": "1.0.0"
}
```

### 2. Check Frontend

Open browser: http://localhost:3000

You should see the GoldVision dashboard.

### 3. Check Database Connection

```bash
# Test database connection from backend
docker compose -f docker-compose.dev.yaml exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect().then(() => {
  console.log('✅ Database connected successfully');
  process.exit(0);
}).catch((err) => {
  console.error('❌ Database connection failed:', err);
  process.exit(1);
});
"
```

### 4. Check All Services

```bash
# Check all service health endpoints
curl http://localhost:8000/health  # Backend
curl http://localhost:8001/health  # Prophet
curl http://localhost:3000        # Frontend
```

---

## Default Credentials

### PostgreSQL Database

- **Host:** `localhost` (from host) or `postgres` (from Docker network)
- **Port:** `5433` (from host) or `5432` (from Docker network)
- **Database:** `goldvision`
- **Username:** `goldvision`
- **Password:** `changeme`

### pgAdmin

- **URL:** http://localhost:5050
- **Email:** `admin@goldvision.com`
- **Password:** `admin`

---

## Environment Variables

The project uses environment variables for configuration. Key variables:

### Database Configuration

```env
DATABASE_URL=postgresql://goldvision:changeme@postgres:5432/goldvision
POSTGRES_PASSWORD=changeme
```

### Service Ports

- **Frontend:** 3000 (dev) or 5173 (production)
- **Backend:** 8000
- **Prophet:** 8001
- **PostgreSQL:** 5433 (host) / 5432 (container)
- **Redis:** 6379
- **pgAdmin:** 5050

---

## 🐛 Troubleshooting

### Issue: Port Already in Use

**Error:** `Bind for 0.0.0.0:8000 failed: port is already allocated`

**Solution:**

```bash
# Find process using the port
lsof -i :8000

# Kill the process or change port in docker-compose.yml
```

### Issue: Database Connection Failed

**Error:** `Can't reach database server`

**Solution:**

```bash
# Check if PostgreSQL container is running
docker compose -f docker-compose.dev.yaml ps postgres

# Check PostgreSQL logs
docker compose -f docker-compose.dev.yaml logs postgres

# Restart PostgreSQL
docker compose -f docker-compose.dev.yaml restart postgres
```

### Issue: Services Not Starting

**Solution:**

```bash
# View detailed logs
docker compose -f docker-compose.dev.yaml logs

# Rebuild containers
docker compose -f docker-compose.dev.yaml up -d --build --force-recreate
```

### Issue: Cannot Connect to Database from Host

**Solution:**

- Ensure you're using port `5433` (not `5432`) when connecting from host machine
- Check firewall settings
- Verify PostgreSQL container is healthy: `docker compose -f docker-compose.dev.yaml ps postgres`

### Issue: Frontend Not Loading

**Solution:**

```bash
# Check frontend logs
docker compose -f docker-compose.dev.yaml logs frontend

# Restart frontend
docker compose -f docker-compose.dev.yaml restart frontend

# Rebuild frontend
docker compose -f docker-compose.dev.yaml up -d --build frontend
```

---

## Additional Notes

### Data Persistence

Database data is stored in Docker volumes:

- **Development:** `postgres_data_dev`
- **Production:** `postgres_data`

Data persists even after stopping containers. To remove data:

```bash
docker compose -f docker-compose.dev.yaml down -v
```

### Running Without Docker

If you prefer to run without Docker, see the main `README.md` for manual setup instructions. However, Docker is the recommended method as it handles all dependencies automatically.

### Production vs Development

- **Development** (`docker-compose.dev.yaml`): Hot-reload, development tools, easier debugging
- **Production** (`docker-compose.yml`): Optimized builds, production settings, Nginx reverse proxy

---

## ✅ Success Checklist

After following this guide, you should have:

- ✅ All Docker containers running
- ✅ Frontend accessible at http://localhost:3000
- ✅ Backend API accessible at http://localhost:8000
- ✅ Database accessible via pgAdmin or psql
- ✅ All services showing healthy status

---

## Support

If you encounter any issues:

1. Check the logs: `docker compose -f docker-compose.dev.yaml logs`
2. Verify all prerequisites are installed
3. Check the main `README.md` for additional documentation
4. Review the troubleshooting section above

---

**Last Updated:** January 2026  
**Project Version:** 1.0.0
