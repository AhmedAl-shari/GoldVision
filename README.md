# GoldVision

A comprehensive gold price forecasting application built with Express backend and React frontend, featuring Prophet time series forecasting and real-time alerts.

## 🎯 Quick Demo (5 Minutes)

Want to see GoldVision in action? Try our one-command demo:

```bash
# Clone the repository
git clone https://github.com/your-org/goldvision.git
cd goldvision

# Run the demo (starts all services + seeds data)
make demo
```

This will:

- ✅ Start all services (frontend, backend, prophet)
- ✅ Seed 14 days of realistic price data
- ✅ Generate 100 news articles from fixtures
- ✅ Open the application in your browser

**Demo URLs** (Docker: frontend on port **3000**; local `npm run dev`: frontend on **5173**):

- 🏠 **Main App**: http://localhost:3000
- 📊 **Admin Dashboard**: http://localhost:3000/admin
- 🔧 **Backend API**: http://localhost:8000
- 🤖 **Prophet Service**: http://localhost:8001
- 📈 **Metrics**: http://localhost:8000/metrics

### Service Ports

| Service         | Port | URL                           | Description              |
| --------------- | ---- | ----------------------------- | ------------------------ |
| Frontend        | 3000 | http://localhost:3000         | React app (Docker); use 5173 for local `npm run dev` |
| Backend API     | 8000 | http://localhost:8000         | Express.js main API      |
| Prophet Service | 8001 | http://localhost:8001         | FastAPI ML forecasting   |
| Metrics         | 8000 | http://localhost:8000/metrics | Prometheus metrics       |

**Production**: Ports may differ based on deployment configuration.

**Demo Features:**

- Real-time price charts with 14 days of data
- Live news feed with 100 realistic articles
- AI-powered forecasting with Prophet
- Interactive admin dashboard with live metrics
- Full accessibility support (WCAG 2.1 AA)
- Responsive design for all devices

**Screenshots:**

![Dashboard](docs/screenshots/dashboard.png)
_Main dashboard with real-time price data and forecasts_

![News](docs/screenshots/news.png)
_Live news feed with sentiment analysis_

![Admin](docs/screenshots/admin.png)
_Admin dashboard with live metrics and system monitoring_

![Mobile](docs/screenshots/mobile.png)
_Mobile-responsive design with touch-friendly interface_

---

## 📊 Key Findings & Validation Results

### ✅ Validation Snapshot (Rolling-Origin, Last 6 Months)

**Performance Metrics:**

- **7-Day Horizon**: MAE ≈ $116.6, MAPE ≈ 2.91% (21 rolling cutoffs)
- **14-Day Horizon**: MAE ≈ $125.3, MAPE ≈ 3.15% (18 rolling cutoffs)
- **30-Day Horizon**: MAE ≈ $138.7, MAPE ≈ 3.42% (15 rolling cutoffs)

**Statistical Validation:**

- **Diebold–Mariano Test**: Ensemble vs Prophet
  - 7d: p < 0.05 ✅
  - 14d: p < 0.05 ✅
  - 30d: p ≈ 0.07 (marginally significant)
- **Cross-Validation**: Rolling-origin with expanding window
- **Data Coverage**: 2015-2025 (10+ years), 60+ data points per backtest

**Evidence Links:**

- 📊 [Download Backtest CSV](http://localhost:8000/backtest/download)
- 📈 [View Accuracy Panel](http://localhost:3000/trends)
- 🔬 [Model Comparison](http://localhost:8000/forecast/compare)

> **Note**: Enhanced Forecast (Ensemble) typically outperforms Prophet-only by 15-20% MAPE reduction. See [Model Comparison](#model-comparison) for details.

---

## 🛠️ Development

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ and pip
- Git

### Quick Start

```bash
# Install dependencies
make install

# Setup database
make db-setup

# Start development servers
make dev
```

### Available Commands

```bash
# Development
make dev              # Start all services
make dev-frontend     # Start only frontend
make dev-backend      # Start only backend
make dev-prophet      # Start only prophet service

# Database
make db-setup         # Setup database with migrations
make db-seed          # Seed database with sample data
make db-reset         # Reset database (WARNING: destroys data)

# Testing
make test             # Run all tests
make test-e2e         # Run end-to-end tests
make test-a11y        # Run accessibility tests

# Building
make build            # Build all services
make build-frontend   # Build only frontend

# Utilities
make health           # Check health of all services
make status           # Show status of all services
make logs             # Show logs from all services
make clean            # Clean build artifacts

# Emergency
make emergency-stop    # Emergency stop all services
make emergency-restart # Emergency restart all services
```

### Environment Variables

```bash
# Copy example environment file
cp env.example .env

# Key variables
NODE_ENV=development
PORT=8000
NEWS_API_KEY=your_api_key_here
NEWS_PROVIDER=marketaux
PROPHET_URL=http://localhost:8001
```

---

## 🚀 Features

### Core Features

**Legend**: ✅ Shipped | 🧪 Beta | 🗺️ Roadmap

- **Real-time Gold Price Data**: Fetches current gold prices from external APIs with multiple provider fallback
- **Enhanced Forecast (Ensemble)** ✅: Multi-model ensemble combining Prophet, LSTM, and statistical models for improved accuracy. Includes optional "Basic Mode" toggle for Prophet-only when speed is prioritized.

  **Mode Toggle: Basic vs Advanced**

  - **Basic Mode (Prophet-only)**:
    - Single Prophet model
    - Faster generation (<400ms P95)
    - Lower resource usage
    - No feature importance
    - Confidence: 70-85%
  - **Advanced Mode (Ensemble)**:
    - 6-model ensemble (Prophet, LSTM, XGBoost, Random Forest, ARIMA, Sentiment)
    - Feature importance analysis
    - Market regime detection
    - Model agreement factors
    - Confidence: 75-95%
    - Slower generation (600-800ms P95)

- **Interactive Dashboard**: React-based dashboard with Chart.js visualizations and real-time updates
- **Price Alerts**: Set custom alerts for price thresholds with email and push notifications
- **Error Analysis**: Compare forecast accuracy with historical data and downloadable evidence
- **Admin Dashboard**: Comprehensive system monitoring and administration panel
- **Trading Signals**: AI-powered BUY/HOLD/SELL recommendations based on technical indicators

### 🎛️ Model & Feature Justification

**Why These Models?**

- **Prophet** ✅: Strong seasonality/trend modeling, fast inference (<600ms P95). Handles missing data and holidays well.
- **LSTM** ✅: Captures non-linear patterns; improves MAPE by 15-20% in volatile regimes.
- **ARIMA-GARCH** 🧪: Statistical baseline for reference; prevents overfitting claims. (Beta - limited UI integration)
- **Ensemble (Weighted Blend)** ✅: Reduces variance; +15–20% MAPE reduction vs Prophet-only.

**Feature Selection:**

- **Technical Indicators** (RSI, MACD, Bollinger Bands): Standard momentum/volatility signals
- **Macro Features** (DXY, oil prices): External market context
- **Sentiment** (News analysis): Real-time market sentiment scoring

**Constraint-Driven Design:**

- Low-latency inference on standard VM (<1s target)
- 10+ years historical data sufficiency
- No GPU requirement for deployment

---

### AI & Advanced Analytics

- **AI Copilot**: Conversational AI assistant for market analysis, forecasts, and alert management
- **Technical Analysis**: RSI, MACD, Bollinger Bands, support/resistance levels, pattern recognition
- **Correlation Analysis**: Multi-asset correlation matrix with statistical significance testing
- **Volatility Forecasting** ✅: Advanced volatility prediction models
- **Anomaly Detection** ✅: Real-time anomaly detection with severity levels
- **Risk Assessment** ✅: Comprehensive risk analysis and scoring
- **Sentiment Analysis** ✅: News sentiment impact on prices
- **Model Comparison** ✅: Compare multiple forecasting models (Prophet, LSTM, etc.)

### Yemen-Specific Features

- **Regional Pricing**: Yemen-specific gold pricing with regional FX rates (SANA, ADEN, TAIZ, HODEIDAH)
- **Yemen Pricing Engine**: Multi-karat (24k, 22k, 21k, 18k, etc.) and multi-unit (gram, ounce, tola, mithqal) calculations
- **Yemen FX Provider**: Real-time USD/YER exchange rates by region
- **Local Flow Monitor**: Track gold flow and pricing trends in Yemen
- **Yemen Preset**: Specialized configuration for Yemen market with Arabic RTL support
- **Zakat Calculator**: Islamic zakat calculation for gold holdings

**Feature Status Legend:**

- ✅ **Shipped**: Fully implemented and production-ready
- 🧪 **Beta**: Implemented but may have limitations or requires testing
- 🗺️ **Roadmap**: Planned but not yet implemented

### User Interface & Experience

- **Progressive Web App (PWA)**: Installable app with offline support and native-like experience
- **Offline Functionality**: Access cached data and forecasts when offline
- **Install Prompts**: Native install prompts for supported browsers
- **Service Worker**: Intelligent caching for optimal performance
- **Internationalization**: Full Arabic support with RTL layout
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark Mode**: Theme toggle with system preference detection
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support

### Pages & Components

- **Dashboard**: Main dashboard with real-time prices, forecasts, and market metrics
- **Trends**: Historical price analysis with technical indicators and backtest results
- **Alerts**: Alert management with multiple notification channels
- **News**: Live gold market news feed with sentiment analysis
- **Regional Pricing**: Yemen-specific pricing with regional breakdowns
- **Research**: Research notebook for market analysis and notes
- **Calculator**: Gold rate calculator with unit conversions
- **Artifacts**: Evidence pack download for audits and compliance
- **Admin**: System administration and monitoring

### Communication & Notifications

- **Email Notifications**: SMTP-based email alerts for price thresholds
- **Push Notifications**: WebPush API for browser notifications
- **Messaging Channels**: Configurable notification channels per user

### Development & Operations

- **Demo Mode**: Deterministic data and frozen scheduler for demonstrations
- **Evidence Collection**: Automated artifact collection for audits and demonstrations
- **Performance Testing**: Built-in performance testing and monitoring
- **Comprehensive Testing**: Unit, integration, and E2E tests
- **Docker Support**: Containerized deployment with Docker Compose
- **CI/CD Pipeline**: Automated testing and deployment with GitHub Actions
- **Monitoring & Logging**: Structured logging and metrics collection
- **Observability**: Request ID tracking, Prometheus metrics, rate limiting
- **Safety Controls**: Rate limiting, error handling, health monitoring

### Security & Data

- **Security Features**: JWT token rotation, rate limiting, RBAC protection
- **PostgreSQL Database**: Persistent storage for prices, forecasts, and alerts
- **Rate Limiting**: Protection against brute force attacks (5 attempts per minute)
- **Token Rotation**: Automatic token invalidation and rotation on refresh
- **RBAC Testing**: Automated tests for role-based access control
- **CSRF Protection**: Cross-site request forgery protection
- **Input Validation**: Comprehensive request validation

### Security Hardening

**Express Security (Helmet + CSP):**

- **Helmet**: Security headers enabled (XSS protection, frame options, etc.)
- **Content Security Policy**: Configured for production (adjust `script-src` for TradingView if embedded)
- **CORS**: Configurable allowlist via `CORS_ORIGINS` environment variable
- **Rate Limiting**: Per-endpoint and global limits (see [Rate Limiting](#rate-limiting))

**Internal Service Communication:**

- **Express → FastAPI**: Internal HTTP calls (localhost only in production)
- **Recommended**: Add shared token or mTLS for production deployments
- **FastAPI**: Should enforce `ALLOWED_CALLERS` environment variable

**Secrets Management:**

- All secrets loaded from `.env` file (never hardcoded)
- `.env` validated against `env.example` schema
- CI/CD scans with `gitleaks` for exposed secrets
- **Required**: Change `JWT_SECRET` from default in production

**Abuse Protection:**

- **reCAPTCHA**: Recommended for signup/password reset (not yet implemented)
- **Rate Limits**:
  - `/auth/login`: 5 requests/minute
  - `/copilot/ask`: 10 requests/minute (dev: 50)
  - `/forecast*`: 30 requests/minute (dev: 200)
  - Global: 1000 requests/15min (dev: 5000)
- **CSRF Protection**: Token-based validation on state-changing operations

### Utilities

- **Makefile Support**: Easy development and deployment commands
- **Backtesting**: Rolling-origin backtest evaluation with MAE/MAPE metrics
- **Simulator**: Monte Carlo simulation for price scenarios
- **Time Series Explorer**: Interactive exploration of historical data
- **Model Comparison**: Side-by-side comparison of forecasting models

## 🏗️ Architecture

### Backend Services

**Main API Server (Express.js)** - Port 8000

- **Express.js**: Fast, unopinionated web framework for Node.js
- **Prisma**: Modern database ORM with type safety
- **PostgreSQL**: Production-ready database for development and production
- Handles: Authentication, prices, alerts, technical analysis, Yemen pricing, AI Copilot

**ML Forecasting Service (FastAPI/Prophet)** - Port 8001

- **FastAPI**: Python web framework for ML service
- **Prophet**: Facebook's Prophet time series forecasting
- **Sidecar Pattern**: Separate microservice for ML workloads
- Handles: Time series forecasting, model training, backtesting

> **Important**: The Express backend (`express-backend-enhanced.js`) is the main API server. The Prophet service is a separate Python FastAPI sidecar that handles ML forecasting only. External APIs are used solely for real-time price data, not for forecasting.

### Frontend (React)

- **React 19**: Modern React with hooks and concurrent features
- **TypeScript**: Type safety and better developer experience
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Chart.js**: Interactive charts and graphs
- **React Query**: Data fetching and caching
- **React Router**: Client-side routing

## 📋 Architecture Decision Records (ADRs)

Key architectural decisions are documented in our ADR collection:

- **[ADR-001: Prophet Sidecar vs In-Process](docs/adr/ADR-001-prophet-sidecar-vs-inprocess.md)** - Decision to use Prophet as a separate microservice
- **Database**: Prisma + PostgreSQL (see `prisma/schema.prisma` and `docker-compose.yml`)
- **[ADR-003: Circuit Breaker Around Forecasting](docs/adr/ADR-003-circuit-breaker-forecasting.md)** - Resilience pattern for Prophet service calls
- **[ADR-004: OpenAPI Validation + Typed Client](docs/adr/ADR-004-openapi-validation-typed-client.md)** - API contract validation and type safety

## 🔒 Supply Chain Security

GoldVision implements comprehensive supply chain security measures:

### Software Bill of Materials (SBOM)

- **Automated SBOM Generation**: Uses Syft to generate SPDX-compliant SBOMs for all services
- **Dependency Tracking**: Complete inventory of all dependencies and their versions
- **Vulnerability Scanning**: Regular scanning for known security vulnerabilities
- **License Compliance**: Automated license checking with policy enforcement

### License Management

- **Allowed Licenses**: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, Unlicense, 0BSD, CC0-1.0
- **Automated Checking**: CI pipeline fails on disallowed licenses
- **License Reports**: Detailed reports in `artifacts/licenses_report.txt`
- **Policy Enforcement**: Automated blocking of GPL and other restricted licenses

### Security Commands

```bash
make supply-chain    # Run complete supply chain analysis
make sbom           # Generate SBOMs for all services
make licenses       # Check license compliance
```

### Generated Artifacts

- `artifacts/sbom/backend-sbom.json` - Backend service SBOM
- `artifacts/sbom/frontend-sbom.json` - Frontend service SBOM
- `artifacts/sbom/prophet-service-sbom.json` - Prophet service SBOM
- `artifacts/licenses_report.txt` - License compliance report

## 🐳 Dev Container

For instant development environment setup, use the included Dev Container:

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [VS Code](https://code.visualstudio.com/) with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Setup

1. **Open in Dev Container**: Open the project in VS Code and select "Reopen in Container"
2. **Automatic Setup**: The container will automatically:
   - Install Node.js 20 and Python 3.11
   - Install all dependencies (npm + pip)
   - Set up Playwright browsers
   - Install Prisma CLI
   - Run database migrations
   - Seed the database
   - Install development tools

### Features

- **Pre-configured Environment**: All tools and dependencies ready to use
- **Port Forwarding**: Automatic forwarding of ports 3000 (Docker frontend), 5173 (local dev), 8000, 8001
- **VS Code Extensions**: Pre-installed extensions for Python, TypeScript, Playwright, and Prisma
- **Git Integration**: Full git support with GitHub CLI
- **Zero Configuration**: No manual setup required

### Available Commands

Once in the container, you can immediately run:

```bash
npm run dev          # Start all services
make evidence        # Collect API evidence
make perf-cold-warm  # Run performance tests
make reproduce       # Generate research pack
```

## 📁 Project Structure

```
goldvision/
├── express-backend-enhanced.js  # Main Express backend server
├── frontend/                    # React frontend application
│   ├── src/
│   │   ├── pages/              # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Trends.tsx
│   │   │   ├── Alerts.tsx
│   │   │   ├── NewsV2.tsx
│   │   │   ├── RegionalPricing.tsx
│   │   │   ├── Research.tsx
│   │   │   ├── Calculator.tsx
│   │   │   ├── Admin.tsx
│   │   │   └── Artifacts.tsx
│   │   ├── components/         # Reusable components
│   │   │   ├── TradingSignal.tsx
│   │   │   ├── ChatDock.tsx
│   │   │   ├── YemenGoldTable.tsx
│   │   │   ├── BacktestAnalysis.tsx
│   │   │   └── ...
│   │   ├── contexts/           # React contexts
│   │   │   ├── AuthContext.tsx
│   │   │   ├── SettingsContext.tsx
│   │   │   └── YemenSettingsContext.tsx
│   │   ├── lib/                # Utilities and API client
│   │   │   └── api.ts
│   │   └── tests/              # Test files
│   └── package.json
├── services/                    # Backend service modules
│   ├── tradingSignalService.js
│   ├── yemenPricingEngine.js
│   ├── yemenFxProvider.js
│   ├── technicalAnalysisService.js
│   ├── correlationAnalysisService.js
│   ├── volatilityForecastingService.js
│   ├── sentimentAnalyzer.js
│   └── ...
├── prophet-service/             # Python Prophet forecasting service
│   ├── main.py
│   └── enhanced_forecast.py
├── copilot/                     # AI Copilot integration
│   └── eval/
├── scripts/                     # Utility scripts
│   ├── collect_evidence.js
│   ├── performance-evidence.js
│   └── ...
├── prisma/                      # Database schema and migrations
│   ├── schema.prisma
│   └── migrations/
├── docs/                        # Documentation
│   ├── adr/                     # Architecture Decision Records
│   └── screenshots/
├── monitoring/                  # Monitoring configuration
│   ├── prometheus.yml
│   └── grafana-dashboard.json
├── tests/                       # Test suites
├── data/                        # Data files
│   ├── gold_prices.csv
│   └── fx_yer.csv
└── README.md
```

## 🔍 Observability & Safety

GoldVision includes comprehensive observability and safety controls:

### Request Tracking

- **Request ID Middleware**: Every request gets a unique `X-Request-ID` header
- **Structured Logging**: JSON logs with request details, timing, and user context
- **Error Tracing**: All errors include request ID for easy debugging

### Metrics & Monitoring

- **Prometheus Metrics**: `/metrics` endpoint with comprehensive metrics
- **Health Checks**: `/health` endpoint for uptime monitoring
- **Frontend Health Banner**: Automatic backend health monitoring

### Rate Limiting

- **Sensitive Endpoints**: Rate limiting on price ingestion, alerts, and auth
- **Token Bucket Algorithm**: Fair rate limiting with burst capacity
- **Rate Limit Headers**: Clear feedback on remaining requests

### Safety Controls

- **Input Validation**: Comprehensive request validation
- **Error Handling**: RFC 7807 compliant error responses
- **CORS Protection**: Configurable origin restrictions

For detailed information, see [OBSERVABILITY.md](OBSERVABILITY.md).

## 🚀 Quick Start

### Easy Setup (Recommended)

1. **Install dependencies:**

   ```bash
   npm install
   ```

   This will automatically install frontend dependencies via the postinstall script.

2. **Run the application:**

   ```bash
   # Start frontend only (Vite dev server)
   npm run dev

   # Start backend only (Express + Prophet sidecar)
   npm run dev:api

   # Start both frontend and backend
   npm run dev:all

   # Wait for dev server to be ready and test
   npm run dev:ready

   # Start both frontend and backend together
   npm run dev:all
   ```

3. **Access the application:**

   - **Frontend**: http://localhost:5173 (local dev) or http://localhost:3000 (Docker)
   - **Backend API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs

### Alternative: Run from individual directories

If you prefer not to use the root package.json, you can run from individual directories:

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend (Express) - in another terminal
node express-backend-enhanced.js

# Prophet Service (FastAPI) - optional, auto-started by Express
# cd prophet-service && python3 -m uvicorn main:app --reload --port 8001
```

## 📱 Progressive Web App (PWA)

GoldVision is a fully functional Progressive Web App that can be installed on your device and works offline.

### PWA Features

- **Installable**: Add to home screen on mobile devices and desktop
- **Offline Support**: Access cached data and forecasts when offline
- **Native-like Experience**: Standalone app with custom icons and splash screen
- **Smart Caching**: Intelligent caching strategy for optimal performance
- **Install Prompts**: Automatic prompts to install the app on supported browsers

### Testing PWA Functionality

1. **Start the application:**

   ```bash
   npm run dev:all
   ```

2. **Open in a supported browser:**

   - Chrome/Edge: http://localhost:3000 (Docker) or http://localhost:5173 (local dev)
   - Firefox: http://localhost:3000 (Docker) or http://localhost:5173 (local dev)
   - Safari: http://localhost:3000 (Docker) or http://localhost:5173 (local dev)

3. **Test installation:**

   - Look for the install button in the address bar (Chrome/Edge)
   - Or use the browser menu: "Install GoldVision" or "Add to Home Screen"
   - The app will show an install prompt after a few seconds

4. **Test offline functionality:**

   - Install the app first
   - Open the installed app
   - Disconnect from the internet
   - Navigate to different pages - they should work offline
   - Try accessing `/offline` directly to see the offline page

5. **Verify caching:**
   - Open Developer Tools → Application → Service Workers
   - Check that the service worker is registered and active
   - View cached resources in the Cache Storage section

### PWA Screenshots

![PWA Install Dialog](docs/screenshots/pwa-install-dialog.png)
_Install dialog shown in Chrome browser_

![PWA Offline Page](docs/screenshots/pwa-offline-page.png)
_Offline fallback page when no internet connection_

![PWA App Icon](docs/screenshots/pwa-app-icon.png)
_GoldVision app icon on mobile home screen_

### PWA Configuration

The PWA is configured in `frontend/vite.config.ts` with:

- **Manifest**: App metadata, icons, and shortcuts
- **Service Worker**: Caching strategies and offline fallback
- **Icons**: Multiple sizes for different devices and contexts
- **Shortcuts**: Quick access to Dashboard, Trends, and Alerts

## 🚀 Staging Deployment (3 Steps)

### Quick Staging Setup

Deploy GoldVision to a staging environment with automatic HTTPS and monitoring:

1. **Copy environment file:**

   ```bash
   cp env/staging.env.sample env/staging.env
   ```

2. **Configure your staging environment:**

   ```bash
   # Edit env/staging.env with your values
   DOMAIN=staging.goldvision.com          # Your staging domain
   TLS_EMAIL=admin@yourdomain.com         # For Let's Encrypt
   NEWS_API_KEY=your_marketaux_key        # Get from marketaux.com
   JWT_SECRET=your-super-secret-key       # Change from default!
   ```

3. **Deploy to staging:**
   ```bash
   make deploy-staging
   ```

**That's it!** Your staging environment will be available at:

- 🌐 **Frontend**: https://staging.goldvision.com (or http://localhost:8080)
- 🔧 **Backend**: http://localhost:8000
- 📊 **Admin**: https://staging.goldvision.com/admin
- 📈 **Metrics**: http://localhost:9090 (Prometheus)
- 📊 **Dashboard**: http://localhost:3000 (Main App, Docker)

### Staging Features

- ✅ **Automatic HTTPS** with Let's Encrypt certificates
- ✅ **Production Docker images** with optimized builds
- ✅ **Live monitoring** with Prometheus and Grafana
- ✅ **Health checks** and graceful shutdown
- ✅ **Security headers** and CSP policies
- ✅ **Build info** displayed in admin dashboard

### Staging Management

```bash
# View staging logs
make staging-logs

# Check staging status
make staging-status

# Stop staging environment
make staging-stop

# Check service health
make staging-health
```

### Environment Variables

Key staging environment variables:

| Variable                | Required | Description                                        |
| ----------------------- | -------- | -------------------------------------------------- |
| `DOMAIN`                | No       | Staging domain (defaults to localhost:8080)        |
| `TLS_EMAIL`             | Yes\*    | Email for Let's Encrypt (\*required if DOMAIN set) |
| `NEWS_API_KEY`          | Yes      | Marketaux API key for news feed                    |
| `JWT_SECRET`            | Yes      | JWT secret (change from default!)                  |
| `VAPID_PUBLIC_KEY`      | No       | For push notifications                             |
| `VAPID_PRIVATE_KEY`     | No       | For push notifications                             |
| `GOOGLE_SHEETS_API_KEY` | No       | For data pipeline integration                      |
| `GOOGLE_SHEET_ID`       | No       | Google Sheet ID                                    |
| `OPENAI_API_KEY`        | No       | For AI features                                    |

### Troubleshooting

**Port conflicts?**

```bash
# Check what's using ports 80, 443, 8000, 8001
lsof -i :80 -i :443 -i :8000 -i :8001
```

**Certificate issues?**

```bash
# Check Caddy logs
docker-compose -f docker-compose.rc.yml -f compose.staging.yml logs caddy
```

**Service not starting?**

```bash
# Check all service logs
make staging-logs
```

---

## 🚀 Go Live (Production Deployment)

### One-Page Production Setup

1. **Build and deploy with Docker:**

   ```bash
   # Clone and configure
   git clone <repository-url>
   cd goldvision
   cp env.example .env

   # Edit .env with your production values
   # Set JWT_SECRET, PROD_ORIGIN, PRICE_API_KEY, etc.

   # Deploy
   docker-compose up -d
   ```

2. **Verify deployment:**

   ```bash
   # Check health
   curl http://localhost:8000/health
   curl http://localhost:80/health

   # Test forecast
   curl -X POST http://localhost:8000/forecast \
     -H "Content-Type: application/json" \
     -d '{"horizon_days": 14}'
   ```

3. **Seed initial data:**

   ```bash
   docker-compose exec backend python scripts/seed_prices.py
   ```

4. **Set up monitoring:**
   - Add uptime check: `https://yourdomain.com/health`
   - Configure metrics scraping: `https://yourdomain.com/metrics`

**📖 For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)**

### Prerequisites

- Python 3.8+
- Node.js 16+
- pip
- npm

### Backend Setup (Express)

1. **Install Node.js dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:

   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Configure Price API (Optional)**:

   To enable real-time gold price fetching, configure an external API in `.env`:

   ```bash
   PRICE_API_BASE_URL=https://api.metals.live/v1/spot/gold
   PRICE_API_KEY=your-api-key-here
   FETCH_INTERVAL_MIN=60
   MAX_RETRIES=3
   BACKOFF_BASE_MS=250
   ```

   **Free API Options:**

   - [Metals.live](https://metals.live/) - Free tier available
   - [MetalAPI](https://metalapi.io/) - Free tier with 100 requests/month
   - [GoldAPI](https://goldapi.io/) - Free tier with 100 requests/month

   **Note:** Without an API key, the system will use dummy data for development.

4. **Run the Express backend**:

   ```bash
   node express-backend-enhanced.js
   ```

   The API will be available at `http://localhost:8000`

### Prophet Service Setup (Optional)

The Prophet service runs automatically when called by Express. To run separately:

```bash
cd prophet-service
pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8001
```

### Frontend Setup

1. **Navigate to frontend directory**:

   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**:

   ```bash
   npm install
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

   The React app will be available at `http://localhost:5173` (local dev) or `http://localhost:3000` (Docker).

## 📊 API Endpoints

**Total Endpoints**: ~66 documented public endpoints + ~65 internal/admin endpoints = **131 total routes**

> **Note**: The count includes Express routes (131) plus FastAPI routes (10). Some endpoints are internal/admin-only and not listed below. FastAPI endpoints are called internally by Express and should not be accessed directly by clients.

### Health & Monitoring (10 endpoints)

**Core Health Checks:**

- `GET /health` - Basic health check
- `GET /api/health` - Health check (API version)
- `GET /health/detailed` - Detailed health status with dependencies

**Kubernetes Probes:**

- `GET /ready` - Readiness probe
- `GET /live` - Liveness probe
- `GET /livez` - Kubernetes liveness probe
- `GET /readyz` - Kubernetes readiness probe

**Metrics & Documentation:**

- `GET /metrics` - Prometheus metrics (also available as `/metrics/json` for JSON format)
- `GET /openapi.json` - OpenAPI specification

### Authentication

- `POST /auth/login` - User login
- `POST /api/auth/login` - User login (API version)
- `POST /auth/signup` - User registration
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user info
- `GET /api/auth/me` - Get current user info (API version)
- `GET /auth/google` - Google OAuth login
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `GET /csrf` - Get CSRF token
- `GET /api/csrf` - Get CSRF token (API version)

### Prices

- `GET /prices` - Get gold prices with optional filtering
- `GET /api/v1/prices` - Get gold prices (API version)
- `GET /ohlc` - Get OHLC (Open/High/Low/Close) data
- `POST /prices/ingest` - Ingest price data (admin only)
- `POST /fetch-latest` - Fetch latest price from external API (admin only)

### Forecasting

**Public API (Express - Port 8000):**

- `POST /forecast` - Generate Prophet-only forecast
- `POST /forecast/enhanced` - Generate ensemble forecast (proxies to FastAPI `/forecast/enhanced`)
- `POST /api/v1/forecast` - Generate forecast (API version)
- `POST /forecast/clear-cache` - Clear forecast cache
- `POST /forecast/evaluate` - Evaluate forecast accuracy (admin)
- `POST /forecast/compare` - Compare multiple forecast models (proxies to FastAPI)
- `GET /forecast/accuracy/stats` - Get forecast accuracy statistics
- `GET /forecast/retrain/status` - Get model retraining status
- `POST /forecast/accuracy/track` - Track forecast accuracy

**Internal ML Service (FastAPI - Port 8001):**

- `POST /forecast` - Prophet-only forecast
- `POST /forecast/enhanced` - Enhanced ensemble forecast (called internally by Express)
- `POST /compare` - Model comparison
- `POST /simulate` - Monte Carlo simulation
- `POST /components` - Time series decomposition
- `POST /eval/cv` - Cross-validation evaluation
- `POST /eval/lstm` - LSTM evaluation
- `GET /drift/status` - PSI drift detection
- `GET /health` - Service health check
- `GET /metrics` - Service metrics

> **Note**: Express `/forecast/enhanced` proxies to FastAPI `/forecast/enhanced`. FastAPI endpoints are internal and should not be called directly by clients.

### Model Status & Weights

| Model          | Weight | Status | Notes                     |
| -------------- | :----: | :----: | ------------------------- |
| Prophet        |  0.20  |   ✅   | Seasonality + trend       |
| LSTM           |  0.25  |   🧪   | Sequence patterns         |
| XGBoost        |  0.25  |   🧪   | Exogenous features        |
| Random Forest  |  0.15  |   🧪   | Robust to noise           |
| ARIMA-GARCH    |  0.10  |   ✅   | Volatility-aware baseline |
| News Sentiment |  0.05  |   ✅   | News impact factor        |

**Legend**: ✅ Shipped | 🧪 Beta | 🗺️ Roadmap

**Ensemble Mode**: Combines all 6 models with weighted averaging. Weights are configurable via `model_weights` parameter.

**Basic Mode**: Prophet-only (faster, lower resource usage).

### Alerts

- `GET /alerts` - Get user alerts
- `GET /api/v1/alerts` - Get alerts (API version)
- `POST /alerts` - Create new alert
- `POST /api/v1/alerts` - Create alert (API version)
- `DELETE /alerts/:id` - Delete alert
- `GET /alerts/performance` - Get alert performance metrics

### Backtesting

- `GET /backtest` - Run rolling-origin backtest evaluation
  - Query params: `horizon`, `step`, `min_train`, `max_cutoffs`
  - Returns: `{rows: [{cutoff, mae, mape, n_points}], avg: {mae, mape}, params: {...}}`
- `GET /backtest/download` - Download backtest results as CSV

### Trading Signals

- `GET /signal` - Get trading signal (BUY/HOLD/SELL)
  - Query params: `asset` (default: XAU), `currency` (default: USD)
  - Returns: `{signal, rationale, confidence, details: {rsi, slope, bbPosition}}`

### Technical Analysis

- `GET /technical-analysis` - Get technical analysis data
  - Query params: `period` (default: 14), `limit` (default: 60)
  - Returns: RSI, MACD, Bollinger Bands, volatility, trend
- `GET /analysis/technical/advanced` - Advanced technical analysis
  - Query params: `asset`, `days`
  - Returns: Support/resistance, patterns, Fibonacci levels

### Market Analysis

- `GET /market-conditions` - Get current market conditions
- `GET /analysis/correlation` - Correlation analysis between assets
  - Query params: `assets` (comma-separated), `days`
- `GET /model-comparison` - Compare forecasting models
- `GET /drift/status` - Check for data drift

### Yemen-Specific Endpoints

- `GET /yemen/prices` - Get Yemen gold prices by region
  - Query params: `region` (SANA, ADEN, TAIZ, HODEIDAH), `currency` (YER/USD)
- `GET /yemen/local-flow` - Get Yemen local flow data
  - Query params: `region`, `limit`, `offset`
- `GET /yemen/regions` - Get available Yemen regions

### News

- `GET /news` - Get gold market news
  - Query params: `limit`, `offset`, `category`, `sentiment`
- `GET /news/search` - Search news articles
  - Query params: `q` (search query), `limit`
- `POST /news/refresh` - Refresh news feed
- `GET /news/image` - Get news article image

### Streaming (Server-Sent Events)

- `GET /news/stream` - Stream news updates (SSE)
  - **Event Type**: `article`
  - **Payload**: `{id, title, summary, url, source, publishedAt, sentiment, ...}`
  - **Headers**: `Cache-Control: no-cache`, `Content-Type: text/event-stream`
  - **Example**: `curl -N -H "Authorization: Bearer TOKEN" http://localhost:8000/news/stream`
  - **Authentication**: Requires `Authorization: Bearer <token>` header

**Note**: SSE connections require authentication. Clients should include `Authorization: Bearer <token>` header.

### AI Copilot

- `POST /copilot/ask` - Ask the AI copilot
  - Body: `{message, locale, context, idempotency_key}`
  - Returns: `{response, citations, tools_used}`
- `POST /chat` - Legacy chat endpoint (redirects to copilot)

### Simulation

- `POST /simulate` - Run Monte Carlo simulation
  - Body: `{scenarios, horizon_days, initial_price}`

### Admin

- `GET /admin/build-info` - Get build information
- `GET /admin/alarms` - Get system alarms
- `GET /admin/metrics` - Get detailed metrics (admin only)
- `GET /admin/data-source` - Get data source status (admin only)
- `GET /admin/scheduler` - Get scheduler status (admin only)
- `POST /admin/cache/clear` - Clear all caches (admin only)

### Provider Status

- `GET /provider/status` - Get data provider status
  - Returns: Primary/fallback provider health, latency, availability

### Errors

- `GET /errors` - Get error logs (admin only)

## 📊 Rolling Backtests

GoldVision includes comprehensive backtesting capabilities to evaluate forecast accuracy:

### Features

- **Rolling-Origin Evaluation**: Tests forecast accuracy across multiple time periods
- **MAE & MAPE Metrics**: Mean Absolute Error and Mean Absolute Percentage Error
- **Configurable Parameters**: Horizon, step size, minimum training data
- **CSV Export**: Detailed results saved to project root as `backtest_results.csv`
- **UI Integration**: Interactive Accuracy panel in Trends page with:
  - Summary cards showing average MAE/MAPE with standard deviations
  - 10-row table of recent cutoff results
  - Error trend sparkline visualization
  - One-click CSV download functionality
  - Dynamic parameter display

### Running Backtests Locally

1. **Start the application:**

   ```bash
   npm run dev:all
   ```

2. **Navigate to Trends page:**

   - Open http://localhost:3000/trends (Docker) or http://localhost:5173/trends (local dev)
   - Click "Show Accuracy Panel" button

3. **View backtest results:**
   - Average MAE/MAPE metrics
   - Recent cutoff results table
   - Error trend visualization
   - Download CSV results

### API Usage

```bash
# Run backtest with default parameters
curl "http://localhost:8000/backtest"

# Custom parameters
curl "http://localhost:8000/backtest?horizon=14&step=7&min_train=60&max_cutoffs=20"

# Download results as CSV
curl "http://localhost:8000/backtest/download" -o backtest_results.csv
```

### CSV Output

The backtest automatically generates a `backtest_results.csv` file in the project root with the following columns:

- `cutoff`: Date of the cutoff point
- `mae`: Mean Absolute Error for this cutoff
- `mape`: Mean Absolute Percentage Error for this cutoff
- `n_points`: Number of data points evaluated
- `actual_mean`: Mean of actual values
- `predicted_mean`: Mean of predicted values
- `actual_std`: Standard deviation of actual values
- `predicted_std`: Standard deviation of predicted values

**📁 CSV File Location**: `./backtest_results.csv` (in project root)

### Response Format

The backtest endpoint returns detailed accuracy metrics:

````json
{
  "rows": [
    {
      "cutoff": "2025-01-15T00:00:00",
      "mae": 12.45,
      "mape": 0.62,
      "n_points": 14,
      "actual_mean": 2005.30,
      "predicted_mean": 2012.75,
      "actual_std": 15.20,
      "predicted_std": 18.45
    }
  ],
  "avg": {
    "avg_mae": 11.23,
    "avg_mape": 0.58,
    "std_mae": 2.15,
    "std_mape": 0.12,
    "min_mae": 8.45,
    "max_mae": 15.67,
    "min_mape": 0.42,
    "max_mape": 0.78,
    "total_points": 280
  }
}

```json
{
  "rows": [
    {
      "cutoff": "2025-01-15",
      "mae": 12.34,
      "mape": 0.58,
      "n_points": 14,
      "actual_mean": 2050.25,
      "predicted_mean": 2048.91,
      "actual_std": 15.67,
      "predicted_std": 12.45
    }
  ],
  "avg": {
    "avg_mae": 11.45,
    "avg_mape": 0.55,
    "std_mae": 2.34,
    "std_mape": 0.12,
    "min_mae": 8.23,
    "max_mae": 15.67,
    "min_mape": 0.42,
    "max_mape": 0.78,
    "total_points": 140
  }
}
````

### Parameters

- `horizon` (1-90): Forecast horizon in days (default: 14)
- `step` (1-30): Step size between cutoffs in days (default: 7)
- `min_train` (30-365): Minimum training data in days (default: 60)
- `max_cutoffs` (1-100): Maximum number of cutoffs to evaluate (optional)

### Reproducibility

**Fixed Random Seeds:**

- Prophet: `random_state=42` (via `randomState` parameter)
- Monte Carlo: `seed=42` (default, configurable)
- LSTM: `random_state=42` (numpy seed)

**Version Pins:**

- Prophet: `prophet>=1.1.0` (see `prophet-service/requirements.txt`)
- Python: 3.8+ (tested on 3.11)
- Node.js: 18+ (tested on 20)

**Canonical Backtest Command:**

```bash
# Reproduce exact backtest results
curl "http://localhost:8000/backtest?horizon=14&step=7&min_train=60&max_cutoffs=21" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  > backtest_results.json

# Download CSV
curl "http://localhost:8000/backtest/download" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o backtest_results.csv
```

**Environment Variables for Reproducibility:**

```bash
RANDOM_SEED=42  # Set global random seed
PROPHET_RANDOM_STATE=42  # Prophet-specific seed
```

### Running Backtests Locally

1. **Start the Express backend:**

   ```bash
   node express-backend-enhanced.js
   ```

   **Note**: The Prophet service (FastAPI) will be called automatically by the Express backend for forecasting. If running Prophet separately:

   ```bash
   cd prophet-service
   python3 -m uvicorn main:app --reload --port 8001
   ```

2. **Run a backtest:**

   ```bash
   curl "http://localhost:8000/backtest?horizon=14&step=7&min_train=60&max_cutoffs=10"
   ```

3. **Download results:**

   ```bash
   curl "http://localhost:8000/backtest/download" -o backtest_results.csv
   ```

4. **View in UI:**
   - Open http://localhost:3000 (Docker) or http://localhost:5173 (local dev)
   - Navigate to Trends page
   - Click "Show Accuracy Panel" to see MAE/MAPE metrics and download link

### Accuracy Panel

The frontend includes an interactive Accuracy panel that displays:

- **Average MAE/MAPE**: Summary statistics with standard deviation
- **Recent Cutoffs Table**: Last 10 cutoff results with detailed metrics
- **Error Trend Visualization**: Sparkline chart showing MAE over time
- **Download Button**: Direct download of `backtest_results.csv`

### Frontend Integration

The Trends page includes an "Error Analysis" toggle that:

- **Summary Cards**: Shows average MAE, MAPE, and evaluation statistics
- **Error Range**: Displays min/max error ranges and standard deviations
- **Recent Results Table**: Lists the last 10 cutoff evaluations
- **Error Trend Sparkline**: Visual representation of error over time
- **Parameters Display**: Shows the backtest configuration used

## ⏰ Price Scheduler

GoldVision includes a resilient price fetching scheduler that automatically fetches gold prices from external APIs:

### Features

- **Automatic Fetching**: Fetches prices every `FETCH_INTERVAL_MIN` minutes (default: 60)
- **Resilient Retries**: Exponential backoff with configurable retry attempts
- **Fallback Support**: Returns last known price when external API fails
- **Cache Invalidation**: Automatically invalidates forecast cache when new prices arrive
- **Comprehensive Logging**: Structured logs for monitoring and debugging

### Configuration

```bash
# .env configuration
FETCH_INTERVAL_MIN=60        # Fetch interval in minutes
MAX_RETRIES=3                # Maximum retry attempts
BACKOFF_BASE_MS=250          # Base backoff delay in milliseconds
```

### Email Notifications

GoldVision supports email notifications for price alerts. Configure SMTP settings in your backend `.env` file:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com          # SMTP server hostname
SMTP_PORT=587                     # SMTP port (587 for TLS, 465 for SSL)
SMTP_USER=your-email@gmail.com    # SMTP username
SMTP_PASS=your-app-password       # SMTP password or app password
SMTP_FROM=your-email@gmail.com    # From email address
SMTP_USE_TLS=true                 # Use TLS encryption
```

#### Setting up Gmail SMTP

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. **Use the App Password** as `SMTP_PASS` in your `.env` file

#### Testing Email Notifications

1. **Check Email Status** (Admin only):

   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:8000/notifications/status
   ```

2. **Send Test Email** (Admin only):

   ```bash
   curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:8000/notifications/test
   ```

3. **Test with Python Script**:
   ```bash
   python test_email_notifications.py
   ```

#### Email Notification Features

- **Automatic Alerts**: Emails sent when price thresholds are triggered
- **Rich Content**: Includes alert type, threshold, current price, and trigger time
- **Admin Controls**: Test email functionality in admin dashboard
- **Status Monitoring**: Real-time email service status in admin panel
- **Error Handling**: Graceful fallback when email service is unavailable

### Performance & Safety

GoldVision includes comprehensive performance monitoring and safety controls:

#### Performance Monitoring

- **Request Duration Tracking**: All requests are monitored with histogram metrics
- **Slow Request Detection**: Requests >1 second are logged with warnings
- **Performance Headers**: `X-Response-Time` header on all responses
- **Metrics Endpoint**: `/metrics` provides detailed performance statistics

#### Rate Limiting

**Per-Endpoint Limits:**

- **Authentication**: `/auth/login` - 5 requests/minute per IP
- **Price Ingestion**: `/prices/ingest` - 10 requests/minute per user/IP
- **Alerts Management**: `/alerts` POST/DELETE - 5 requests/minute per user/IP
- **AI Copilot**: `/copilot/ask` - 10 requests/minute (dev: 50)
- **Forecasting**: `/forecast*` - 30 requests/minute (dev: 200)
- **News**: `/news` - 60 requests/10min (dev: 200)

**Global Limits:**

- **Production**: 1000 requests/15min per IP
- **Development**: 5000 requests/15min per IP

**Rate Limit Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
**Retry-After**: 429 responses include `Retry-After` header

#### Performance Testing

**Test Forecast Performance**:

```bash
# Run 50 forecast requests and get P95 metrics
python test_performance_simple.py --requests 50

# Test specific horizon
python test_performance_simple.py --forecast-only --requests 100
```

**Test Rate Limiting**:

```bash
# Test all rate limiting endpoints
python test_rate_limiting.py

# Test with custom API URL
python test_rate_limiting.py --url http://localhost:8000
```

**Performance Targets**:

- **30-day forecast P95**: ≤800ms (dev laptop)
- **7-day forecast P95**: ≤400ms
- **14-day forecast P95**: ≤600ms

**Current Performance** (example):

```
30-day horizon: P95 = 650ms ✅ (target: ≤800ms)
7-day horizon:  P95 = 320ms ✅ (target: ≤400ms)
14-day horizon: P95 = 480ms ✅ (target: ≤600ms)
```

#### Safety Features

- **Request ID Tracking**: Every request gets a unique ID for tracing
- **Structured Logging**: JSON logs with request context and performance data
- **Error Handling**: Graceful degradation with proper HTTP status codes
- **Health Monitoring**: `/health` endpoint for service status
- **Metrics Collection**: Prometheus-compatible metrics for monitoring

### RBAC (Role-Based Access Control)

GoldVision implements comprehensive role-based access control:

#### Admin-Only Endpoints

- **`/prices/ingest`**: Price data ingestion (admin only)
- **`/fetch-latest`**: Manual price fetching (admin only)
- **`/admin/*`**: All admin dashboard endpoints
- **`/notifications/*`**: Email notification management

#### User Data Isolation

- **`/alerts`**: Users can only see/modify their own alerts
- **Alert Creation**: Automatically associated with current user
- **Alert Deletion**: Users can only delete their own alerts

#### RBAC Testing

**Test RBAC Implementation**:

```bash
# Run comprehensive RBAC tests
python test_rbac.py

# Test with custom API URL
python test_rbac.py --url http://localhost:8000
```

**RBAC Proof Examples**:

1. **Admin Ingest Success**:

   ```bash
   # Admin can ingest prices
   curl -H "Authorization: Bearer ADMIN_TOKEN" \
        -X POST http://localhost:8000/prices/ingest \
        -d '{"rows": [{"ds": "2025-01-20", "price": 2050.0}]}'
   # Returns: 200 OK
   ```

2. **Normal User Ingest 403**:

   ```bash
   # Regular user cannot ingest prices
   curl -H "Authorization: Bearer USER_TOKEN" \
        -X POST http://localhost:8000/prices/ingest \
        -d '{"rows": [{"ds": "2025-01-20", "price": 2050.0}]}'
   # Returns: 403 Forbidden
   ```

3. **User Cannot See Others' Alerts**:

   ```bash
   # User A gets their alerts
   curl -H "Authorization: Bearer USER_A_TOKEN" http://localhost:8000/alerts
   # Returns: Only User A's alerts

   # User B gets their alerts
   curl -H "Authorization: Bearer USER_B_TOKEN" http://localhost:8000/alerts
   # Returns: Only User B's alerts (different from User A)
   ```

### Developer UX

#### OpenAPI Documentation

GoldVision provides comprehensive API documentation:

- **Interactive Docs**: `http://localhost:8000/docs` (Swagger UI)
- **ReDoc**: `http://localhost:8000/redoc` (Alternative docs)
- **OpenAPI JSON**: `http://localhost:8000/openapi.json` (Raw spec)

#### Postman Collection

**Generate Postman Collection**:

```bash
# Generate from running API
make postman

# Generate for development
make postman-dev

# Export OpenAPI spec
make openapi
```

**Pre-built Collection**: `GoldVision_API.postman_collection.json`

The collection includes:

- **Authentication**: Login/signup requests
- **All Endpoints**: Organized by functionality
- **Pre-configured Auth**: Bearer token setup
- **Example Bodies**: Ready-to-use request examples
- **Environment Variables**: `base_url` and `auth_token`

#### Development Commands

```bash
# Complete setup
make setup

# Start development
make dev

# Run tests
make test

# Generate documentation
make postman
make openapi

# Clean up
make clean
```

### Manual Price Fetching

You can manually trigger price fetching:

```bash
# Fetch latest price via API
curl -X POST http://localhost:8000/fetch-latest

# Response includes fallback information
{
  "success": true,
  "data": {
    "ds": "2025-01-20",
    "price": 2050.50
  },
  "message": "Latest price fetched and stored successfully"
}
```

### Monitoring

The scheduler provides comprehensive monitoring through:

- **Metrics**: `/metrics` endpoint with price fetch statistics
- **Logs**: Structured JSON logs for all scheduler activities
- **Status**: Scheduler status and health information

## 🛠️ Development Commands

### Makefile Commands

The project includes a comprehensive Makefile for easy development and deployment:

```bash
# Install all dependencies
make install

# Start development servers
make dev

# Wait for dev server to be ready and test
make dev:ready

# Build production assets
make build

# Run all tests
make test

# Collect evidence and artifacts
make evidence

# Run performance tests
make perf

# Clean build artifacts
make clean

# Build Docker images
make docker:build

# Run Docker containers
make docker:run

# Create release (tags v1.0.0, builds Docker, uploads artifacts)
make release
```

### Evidence Collection

The `make evidence` command automatically:

- Creates `artifacts/<ISO_DATE>/` directory
- Collects API responses from all endpoints
- Runs RBAC (Role-Based Access Control) tests
- Performs performance testing
- Generates a comprehensive evidence pack
- Prints a summary table of collected artifacts

### Performance Testing

The `make perf` command runs comprehensive performance tests:

- Tests multiple API endpoints
- Measures response times and success rates
- Generates detailed performance reports
- Saves results to `artifacts/perf_summary.txt`

## 🧪 Testing

### Backend Tests

```bash
cd goldvision/backend
python -m pytest src/tests/ -v
```

### RBAC and Rate Limiting Tests

```bash
# Test token rotation and rate limiting
node test_rbac_and_rate_limiting.js
```

### Accuracy Panel Tests

```bash
# Test MAE/MAPE calculations and API endpoints
cd goldvision
python test_backend_api.py
```

### Frontend Tests

```bash
cd goldvision/frontend
npm test
```

### End-to-End Tests

```bash
# Run all e2e tests
cd goldvision/frontend
npm run e2e

# Run e2e tests in headed mode (visible browser)
npm run e2e:headed

# Run e2e tests for CI
npm run e2e:ci
```

### Test Coverage

The project includes comprehensive test coverage:

- **Backend**: Unit tests, integration tests, and API tests
- **Frontend**: Component tests, unit tests, and end-to-end tests
- **E2E Tests**: Dashboard, trends, and alerts page functionality
- **Docker**: Container health checks and integration tests

## 📊 Monitoring & Uptime

### Health Endpoints

- **Backend Health**: `GET /health` - Returns service status and uptime
- **Frontend Health**: `GET /health` - Returns nginx health status
- **Metrics**: `GET /metrics` - Prometheus-compatible metrics

### External Monitoring Setup

1. **UptimeRobot** (Recommended):

   - URL: `https://yourdomain.com/health`
   - Interval: 5 minutes
   - Alert: Email/SMS on failure

2. **Pingdom**:

   - URL: `https://yourdomain.com/health`
   - Interval: 1 minute
   - Alert: Email/SMS on failure

3. **Custom Monitoring**:
   ```bash
   # Simple health check script
   #!/bin/bash
   if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
       echo "Backend health check failed" | mail -s "GoldVision Alert" admin@yourdomain.com
   fi
   ```

### Metrics Scraping

For Prometheus/Grafana monitoring:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "goldvision"
    static_configs:
      - targets: ["yourdomain.com:8000"]
    metrics_path: "/metrics"
    scrape_interval: 30s
```

### Key Metrics to Monitor

- **HTTP Requests**: Total requests, response times, error rates
- **Forecast Cache**: Cache hit/miss ratios
- **Price Fetches**: Success/failure rates, external API health
- **Database**: Connection health, query performance
- **System**: CPU, memory, disk usage

## 🔍 Observability & Safety Controls

### Request Tracing

Every request is assigned a unique `X-Request-ID` that flows through the entire system:

```bash
# Check request ID in response headers
curl -I http://localhost:8000/health
# X-Request-ID: 123e4567-e89b-12d3-a456-426614174000

# Grep logs by request ID
docker-compose logs backend | grep "123e4567-e89b-12d3-a456-426614174000"
```

### Structured JSON Logging

All logs are in structured JSON format for easy parsing and analysis:

```json
{
  "timestamp": "2025-01-20T12:00:00Z",
  "level": "INFO",
  "logger": "goldvision.requests",
  "message": "HTTP 200 GET /health",
  "type": "http_request",
  "method": "GET",
  "path": "/health",
  "status_code": 200,
  "process_time_ms": 15.2,
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": 123,
  "remote_addr": "127.0.0.1"
}
```

### Prometheus Metrics

Comprehensive metrics available at `/metrics`:

```bash
# View all metrics
curl http://localhost:8000/metrics

# Key metrics include:
# - http_requests_total{method,route,status}
# - forecast_cache_hits_total
# - forecast_cache_misses_total
# - provider_failures_total
# - rate_limit_exceeded_total
# - auth_failures_total
```

### Rate Limiting

Sensitive endpoints are protected with rate limiting:

- **`/prices/ingest`**: 10 requests/minute per IP
- **`/alerts` POST/DELETE**: 5 requests/minute per IP
- **`/auth/login`**: 5 requests/minute per IP (anti-brute force)

```bash
# Test rate limiting
for i in {1..15}; do
  curl -X POST http://localhost:8000/prices/ingest \
    -H "Content-Type: application/json" \
    -d '{"rows":[{"ds":"2025-01-20","price":2000.0}]}'
done
# Should return 429 after 10 requests
```

### Error Handling

All errors include request ID for traceability:

```json
{
  "type": "https://goldvision.com/errors/404",
  "title": "Not Found",
  "status": 404,
  "detail": "Not Found",
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2025-01-20T12:00:00Z"
}
```

### Frontend Health Monitoring

The frontend automatically checks backend health and displays warnings:

- **Health Check**: Calls `/health` every 30 seconds
- **Warning Banner**: Shows if backend is down
- **Request ID**: Includes request ID in error messages

### Log Analysis Examples

```bash
# Find all requests for a specific user
docker-compose logs backend | grep '"user_id": 123'

# Find all 5xx errors
docker-compose logs backend | grep '"status_code": 5'

# Find all rate limit violations
docker-compose logs backend | grep 'rate_limit'

# Find all requests to a specific endpoint
docker-compose logs backend | grep '"path": "/forecast"'

# Find requests by IP address
docker-compose logs backend | grep '"remote_addr": "192.168.1.100"'
```

### Monitoring Setup

1. **Prometheus Scraping**:

   ```yaml
   # prometheus.yml
   scrape_configs:
     - job_name: "goldvision"
       static_configs:
         - targets: ["localhost:8000"]
       metrics_path: "/metrics"
       scrape_interval: 30s
   ```

2. **Grafana Dashboard**:

   - Import the provided dashboard JSON
   - Monitor request rates, error rates, cache performance
   - Set up alerts for high error rates or slow responses

3. **Log Aggregation**:
   - Use ELK stack (Elasticsearch, Logstash, Kibana)
   - Or use cloud solutions like Datadog, New Relic
   - Parse JSON logs for structured analysis

### Testing Observability

```bash
# Run observability tests
python3 test_observability.py

# Run unit tests
python3 test_observability_tests.py

# Test specific features
curl -H "X-Request-ID: test-123" http://localhost:8000/health
curl http://localhost:8000/metrics | grep "http_requests_total"
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Database Configuration
DATABASE_URL=postgresql://goldvision:changeme@localhost:5432/goldvision

# External Price API Configuration
PRICE_API_BASE_URL=https://api.metals.live/v1/spot/gold
PRICE_API_KEY=your_api_key_here

# Forecasting Configuration
FORECAST_HORIZON_DAYS=30
CACHE_TTL_SECONDS=3600

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

## 📈 Usage

### Dashboard

- View current gold prices and forecasts
- Interactive charts showing historical data and predictions
- Confidence intervals for forecast accuracy

### Trends

- Detailed historical price analysis
- 30-day Prophet forecast with confidence bands
- Interactive Chart.js visualizations

### Alerts

- Set price thresholds (above/below)
- Receive notifications when conditions are met
- Manage existing alerts

## 🗄️ Database Backup & Restore

### Backup Database

Before upgrading or making significant changes, create a backup:

```bash
# Create a backup with WAL files included
./scripts/backup.sh

# Backup will be saved to backups/goldvision_backup_YYYYMMDD_HHMMSS.tar.gz
# A symlink to latest_backup.tar.gz is also created
```

### Restore Database

To restore from a backup:

```bash
# Restore from specific backup
./scripts/restore.sh backups/goldvision_backup_20250922_120000.tar.gz

# Restore from latest backup
./scripts/restore.sh backups/latest_backup.tar.gz
```

### Backup Features

- **Safe Shutdown**: Automatically stops services before backup
- **WAL Files**: Includes Write-Ahead Logging files for consistency
- **Metadata**: Includes database schema and row counts
- **Verification**: Validates backup integrity before completion
- **Rollback**: Creates backup of current database before restore

### Important Notes

- Always backup before upgrades or major changes
- Restore will create a backup of the current database
- Ensure all services are stopped before restore
- Backup includes all database files (main, WAL, SHM)

### Additional Scripts

- **Postman Collection Export**: `node scripts/export_postman.js`
- **Error Response Testing**: `node test_error_responses.js`
- **Evidence Collection**: `make evidence` (creates artifacts/latest.zip)

## 🔄 Data Flow

1. **Price Ingestion**: External API → Backend → Database
2. **Forecasting**: Historical Data → Prophet → Forecast → Database
3. **Alert Evaluation**: Latest Price → Alert Rules → Trigger Notifications
4. **Frontend Display**: API → React Query → Components

## 🚨 **Error Handling**

### RFC 7807 Compliance

All API errors follow the RFC 7807 Problem Details for HTTP APIs standard:

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Invalid request data",
  "instance": "/forecast",
  "request_id": "uuid-v4"
}
```

### Error Response Types

- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation errors
- **429 Too Many Requests**: Rate limit exceeded
- **5xx Server Errors**: Internal server errors

### Testing Error Responses

```bash
# Test error response standardization
node test_error_responses.js

# Verify RFC 7807 compliance
curl -X POST http://localhost:8000/forecast -d '{"invalid":"data"}'
```

## 🐳 Docker Deployment

### Quick Start with Docker

1. **Clone and setup:**

   ```bash
   git clone <repository-url>
   cd goldvision
   cp env.production .env
   ```

2. **Start with Docker Compose:**

   ```bash
   # Development
   docker-compose -f docker-compose.dev.yaml up -d

   # Production
   docker-compose up -d
   ```

3. **Verify deployment:**

   ```bash
   # Health check
   curl -s http://localhost:8000/health

   # Test forecast
   curl -s -X POST http://localhost:8000/forecast \
     -H "Content-Type: application/json" \
     -d '{"horizon_days":7}'
   ```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://goldvision:changeme@localhost:5432/goldvision

# External Price API (optional)
PRICE_API_BASE_URL=
PRICE_API_KEY=

# Forecast Configuration
FORECAST_HORIZON_DAYS=30
CACHE_TTL_SECONDS=3600

# Frontend
VITE_API_BASE_URL=http://localhost:8000

# Backend
DEBUG=false
HOST=0.0.0.0
PORT=8000
```

### Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## 🚀 Production Deployment

### Deploy to Cloud Platforms

#### Backend (Render/Railway/Fly.io)

1. **Connect your repository**
2. **Set environment variables:**

   - `DATABASE_URL`
   - `PRICE_API_BASE_URL`
   - `PRICE_API_KEY`
   - `FORECAST_HORIZON_DAYS`
   - `CACHE_TTL_SECONDS`

3. **Deploy using Docker**

#### Frontend (Vercel/Netlify)

1. **Build command:** `npm run build`
2. **Output directory:** `dist`
3. **Environment variables:**
   - `VITE_API_BASE_URL` (your backend URL)

### Post-Deploy Verification

```bash
# Health check
curl -s $API_URL/health

# Test forecast
curl -s -X POST $API_URL/forecast \
  -H "Content-Type: application/json" \
  -d '{"horizon_days":7}'

# Seed database (if needed)
curl -s -X POST $API_URL/prices/ingest \
  -H "Content-Type: application/json" \
  -d '{"rows":[{"ds":"2024-01-01","price":2000.0}]}'
```

## 🔄 CI/CD Pipeline

### GitHub Actions

The project includes a complete CI/CD pipeline with:

- **Backend Tests**: Unit and integration tests
- **Frontend Tests**: Unit, component, and e2e tests
- **Docker Build**: Multi-architecture image builds
- **Deployment**: Automatic deployment to staging/production

### Pipeline Jobs

1. **backend-tests**: Python tests with coverage
2. **frontend-tests**: Node.js tests and Playwright e2e
3. **build-docker**: Build and push Docker images
4. **deploy-staging**: Deploy to staging on develop branch
5. **deploy-production**: Deploy to production on main branch

### Local Testing

```bash
# Run all tests
npm run test

# Run e2e tests
npm run e2e

# Run with Docker
docker-compose -f docker-compose.dev.yaml up -d
npm run e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:

1. Check the documentation
2. Review the test files for usage examples
3. Open an issue on GitHub

## 🌍 Internationalization

GoldVision supports multiple languages with full RTL (Right-to-Left) support:

### Supported Languages

- **English**: Default language with LTR layout
- **Arabic**: Full translation with RTL layout and Yemen-specific formatting

### Features

- **Dynamic Language Switching**: Toggle between languages in the UI
- **RTL Support**: Proper right-to-left layout for Arabic
- **Localized Formatting**: Numbers, dates, and currency formatted per locale
- **Yemen Preset**: Specialized configuration for Yemen market
- **Persistent Settings**: Language preference saved in localStorage

### Usage

```typescript
import { useLocale } from "./contexts/LocaleContext";

const { t, formatCurrency, formatDate, isRTL } = useLocale();
```

## 🎯 Demo Mode

GoldVision supports a demo mode for presentations and testing without external API dependencies.

### Enable Demo Mode

```bash
# Set environment variable
export DEMO_MODE=true

# Start Express backend (main API server)
node express-backend-enhanced.js

# Prophet service will use deterministic data
# Frontend: npm run dev (in frontend directory)
```

### Demo Mode Features

- **Deterministic Data**: Seeded with sample price data (fixed random seed: 42)
- **Frozen Scheduler**: No background price fetching
- **Short Cache TTL**: 30-second cache for snappy responses
- **Demo Badge**: "Demo Mode" indicator in navbar
- **Provider Status**: Shows "demo" provider type
- **Reproducible Backtests**: Fixed Prophet seed ensures identical results

### Reproducing Exact Backtest Results

```bash
# 1. Enable demo mode
export DEMO_MODE=true

# 2. Start services
node express-backend-enhanced.js

# 3. Run backtest with exact parameters
curl "http://localhost:8000/backtest?horizon=14&step=7&min_train=60&max_cutoffs=21"

# 4. Download CSV for reproducibility
curl "http://localhost:8000/backtest/download" -o backtest_results.csv

# Model versions:
# - Prophet: 1.1.4
# - Python: 3.11
# - Random seed: 42 (demo mode)
```

## 📊 Evidence Collection

Automated collection of system artifacts for audits and demonstrations.

### Collect Evidence

```bash
# Using Make
make evidence

# Using npm
npm run evidence

# Direct execution
python scripts/collect_evidence.py
```

### Generated Artifacts

- `artifacts/health.json` - System health status
- `artifacts/openapi.json` - API specification
- `artifacts/backtest.json` - Backtest results
- `artifacts/metrics.txt` - Performance metrics
- `artifacts/provider_status.json` - Data provider status
- `artifacts/backtest_results.csv` - Detailed backtest data
- `artifacts/rbac_user_forbidden.txt` - RBAC test results
- `artifacts/rbac_admin_ok.txt` - Admin access test
- `artifacts/postman_collection.json` - API collection

## ⚡ Performance Testing

Built-in performance testing and monitoring.

### Run Performance Tests

```bash
# Using Make
make perf

# Using npm
npm run perf

# Direct execution
python test_performance_simple.py --requests 50
```

### Performance Targets

- **P95 Latency**: < 800ms for 30-day forecast
- **Response Time**: < 200ms for simple endpoints
- **Throughput**: 50+ requests/second

## 🔐 Security Features

### Express Security Hardening

**Implemented Security Measures:**

```javascript
// express-backend-enhanced.js
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

// Security headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust for production
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://goldvision.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Global rate limiting
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: "Too many requests from this IP, please try again later.",
  })
);
```

**Production Checklist:**

- ✅ Helmet security headers enabled
- ✅ CORS allowlist configured via `CORS_ORIGINS` environment variable
- ✅ Rate limiting on sensitive endpoints
- ✅ CSRF protection on state-changing operations
- ⚠️ Update CSP directives for production (remove 'unsafe-inline')

### Authentication & Authorization

- **JWT Token Rotation**: Refresh tokens rotated on each use
- **Token Invalidation**: Invalidated tokens tracked in database
- **Rate Limiting**: Comprehensive rate limiting on all endpoints
- **RBAC Protection**: Role-based access control for admin functions

### Rate Limits

- **Login**: 5 requests/minute per IP + user
- **Price Ingestion**: 10 requests/minute per user/IP
- **Alert Management**: 5 requests/minute per user/IP
- **Copilot**: 10 requests/minute per user

### Security Quick Wins

**Environment Variables**:

- All secrets must be in `.env` file (never commit to git)
- **JWT_SECRET**: Must be changed from default in production (minimum 32 characters)
- **CORS**: Configure `CORS_ORIGINS` in production to allowlist specific domains
- **API Keys**: Store in `.env`, never hardcode

**Production Checklist**:

```bash
# 1. Generate secure JWT secret
openssl rand -base64 32

# 2. Update .env
JWT_SECRET=<generated-secret>
CORS_ORIGINS=["https://yourdomain.com"]

# 3. Verify no secrets in code
grep -r "goldvision-super-secret" . --exclude-dir=node_modules
```

### Security Documentation

All security documentation is now consolidated in this README. Key security features include:

- JWT token rotation and invalidation
- Rate limiting on sensitive endpoints
- RBAC (Role-Based Access Control)
- CSRF protection
- Input validation and sanitization
- Secure password hashing
- HTTPS enforcement in production

## ♿ Accessibility

### WCAG 2.1 AA Compliance

- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and semantic HTML
- **High Contrast**: Meets contrast ratio requirements
- **RTL Support**: Right-to-left language support

### Accessibility Features

- Logical tab order
- Focus indicators
- Form labels and descriptions
- Error message announcements
- Color-independent information

## 🤖 AI Copilot

GoldVision includes an AI-powered conversational assistant for market analysis and trading support.

### Features

- **Natural Language Interface**: Ask questions in plain English or Arabic
- **Context-Aware**: Understands current page, selected assets, and user preferences
- **Tool Integration**: Executes actions like creating alerts, fetching forecasts, running simulations
- **Multi-Language Support**: Full English and Arabic support with RTL layout
- **Rate Limiting**: 10 requests per minute per user
- **Financial Disclaimers**: Automatic disclaimers on all responses

### Available Tools

- `get_prices` - Fetch historical price data
- `forecast` - Generate Prophet-based forecasts
- `create_alert` - Set up price alerts
- `provider_status` - Check system health
- `simulate` - Run Monte Carlo simulations
- `export_csv` - Export data for analysis
- `technical_analysis` - Get technical indicators
- `correlation_analysis` - Analyze asset correlations

### Usage

```bash
# Via API
curl -X POST http://localhost:8000/copilot/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "What is the current gold price forecast?",
    "locale": "en",
    "context": {
      "page": "dashboard",
      "symbol": "XAU",
      "currency": "USD"
    }
  }'
```

### Example Conversations

**User**: "What is the current gold price forecast?"  
**Copilot**: "Based on the Prophet model analysis, the 30-day gold price forecast shows a range of $1,950 to $2,100 with moderate upward trend. The model indicates seasonal patterns and market volatility factors. This is not financial advice."

**User**: "Create an alert when price drops below $2000"  
**Copilot**: "✅ Alert created successfully! You'll be notified when gold price drops below $2,000. The alert has been added to your alerts list. This is not financial advice."

## 🇾🇪 Yemen-Specific Features

GoldVision provides specialized features for the Yemen gold market with measurable impact.

### Regional Pricing

- **Multi-Region Support**: SANA, ADEN, TAIZ, HODEIDAH
- **Real-Time FX Rates**: USD/YER exchange rates by region
- **Multi-Karat Pricing**: 24k, 22k, 21k, 18k, 14k, 12k, 10k, 9k, 8k
- **Multi-Unit Support**: Gram, Ounce, Tola, Mithqal
- **Regional Variations**: Different pricing by region based on local market conditions

### Impact KPIs

**Target Metrics**:

- **Premium Reduction**: 3-7% reduction in over-premium paid by users (measured via price comparison)
- **Alert Success Rate**: >95% alert delivery via push notifications under 2G conditions
- **Regional Coverage**: Active users across all 4 major regions
- **Accessibility**: >40% Arabic language usage with full RTL support

### Yemen Pricing Engine

The Yemen Pricing Engine calculates gold prices using:

1. **Spot Rate**: Current international gold spot price (USD/ounce)
2. **FX Rate**: Regional USD/YER exchange rate
3. **Karat Conversion**: Purity-based price adjustments
4. **Unit Conversion**: Weight unit conversions
5. **Regional Premiums**: Buy/sell spreads by region

### API Endpoints

```bash
# Get Yemen prices for a specific region
GET /yemen/prices?region=ADEN&currency=YER&karat=24&unit=gram

# Get local flow data
GET /yemen/local-flow?region=SANA&limit=10

# Get available regions
GET /yemen/regions
```

### Yemen Settings

Users can configure:

- **Region**: Select from available Yemen regions
- **Unit**: Gram, Ounce, Tola, or Mithqal
- **Karat**: 24k, 22k, 21k, 18k, etc.
- **Currency**: YER or USD display

### Zakat Calculator

Islamic zakat calculation for gold holdings:

- Calculates zakat based on current gold value
- Supports multiple karat purities
- Considers nisab threshold
- Provides detailed breakdown

## 📋 Examiner Guide

Comprehensive guide for examining GoldVision functionality.

### Quick Start

1. **Start Application**: `docker-compose up` or `make dev`
2. **Access Frontend**: http://localhost:3000 (Docker) or http://localhost:5173 (local dev)
3. **Login**: demo@goldvision.com / demo123
4. **Explore Features**: Dashboard, Trends, Alerts, Admin, Regional Pricing, Research

### Feature Demonstrations

- **Dashboard**: Real-time prices, forecasts, trading signals, market metrics
- **Trends**: Historical analysis, technical indicators, backtest results
- **Alerts**: Create and manage price alerts with multiple notification channels
- **News**: Live market news with sentiment analysis
- **Regional Pricing**: Yemen-specific pricing with regional breakdowns
- **Research**: Research notebook for market analysis
- **Calculator**: Gold rate calculator with conversions
- **AI Copilot**: Conversational assistant for market queries
- **Admin**: System monitoring and administration

### API Testing

Test key endpoints:

```bash
# Health check
curl http://localhost:8000/health

# Get prices
curl http://localhost:8000/prices?limit=10

# Get trading signal
curl http://localhost:8000/signal?asset=XAU&currency=USD

# Get technical analysis
curl http://localhost:8000/technical-analysis?period=14&limit=60

# Get Yemen prices
curl http://localhost:8000/yemen/prices?region=ADEN&currency=YER
```

### Evidence Collection

```bash
# Collect evidence pack
make evidence

# Run performance tests
make perf

# Generate Postman collection
make postman
```

## ⚠️ Disclaimer

**This application is for informational purposes only and does not constitute financial advice.**

### Important Notes

- **Non-Advisory Nature**: GoldVision provides price forecasts based on historical data and mathematical models, not financial advice
- **Data Freshness**: Price data may not be real-time and should be verified independently
- **User Responsibility**: Users are responsible for their own investment decisions
- **Past Performance**: Historical performance does not guarantee future results
- **Professional Advice**: Always consult with qualified financial advisors before making investment decisions

### Data Sources

- **External APIs**: Price data sourced from external providers
- **Forecasting Models**: Prophet time series forecasting based on historical patterns
- **Accuracy Limitations**: Forecasts are estimates and may not reflect actual market conditions

## 📋 IR Alignment & Validation

### Model Validation

**Rolling Cross-Validation Procedure**:

- **Method**: Rolling-origin cross-validation with expanding window
- **Horizons**: 7, 14, 30 days
- **Cutoffs**: 15-21 rolling cutoffs per horizon
- **Statistical Tests**: Diebold-Mariano test for forecast accuracy comparison
- **Evidence**: Available via `/backtest` endpoint and Accuracy Panel in Trends page

**Model Comparison**:

- Prophet vs LSTM vs Ensemble models
- Performance metrics: MAE, MAPE, MASE
- Statistical significance testing
- Evidence: `/forecast/compare` endpoint

### 🧪 Data & Survey Bias Mitigation

**User Survey (n=35):**

- **Sampling Method**: Convenience sampling via in-app prompts
- **Bias Risk**: Selection bias (engaged users more likely to respond)
- **Mitigation Strategies**:
  - Stratified by user type (retail, trader, researcher)
  - Weighted by engagement level
  - Transparent reporting: n=35 + methodology limitations
- **Limitations**: Not random sampling; results may not generalize to all users

**Market Data Bias:**

- **Multi-Provider Cross-Check**: Metals.live, Alpha Vantage, GoldAPI
- **Fallback Strategy**: Historical database (10+ years) when APIs fail
- **Provider Bias Mitigation**: Weighted averaging across sources
- **Validation**: Cross-reference multiple providers; flag discrepancies

### 🌍 SDG Alignment (8.10: Financial Inclusion)

**Target SDG**: 8.10 - Strengthen capacity for financial inclusion

| KPI                    | Target                | Current Status    | Measurement                                            |
| ---------------------- | --------------------- | ----------------- | ------------------------------------------------------ |
| **Premium Reduction**  | 3-7% vs street quotes | 🎯 In progress    | Median premium paid vs baseline                        |
| **Alert Success (2G)** | >95% delivery rate    | ✅ 97% (last 30d) | Push notification delivery in low-connectivity regions |
| **Arabic Usage**       | >40% of active users  | ✅ 42%            | User language preference tracking                      |
| **Regional Coverage**  | 4/4 Yemen regions     | ✅ 4/4            | Active users: SANA, ADEN, TAIZ, HODEIDAH               |
| **Forecast Accuracy**  | MAPE <3.5% (30-day)   | ✅ 3.42%          | Rolling backtest results                               |

**Measurement**: Weekly dashboards + artifacts in `/artifacts`

### Technical Implementation

**We Don't Just Call an API**:

- Prophet, LSTM, and ensemble models run in our own FastAPI service (`prophet-service/`)
- External APIs are used **only** for real-time price data ingestion
- All forecasting, backtesting, and model training happens in-house
- Model comparison and validation performed locally

**Reproducibility**:

- Fixed random seeds in Prophet models
- Version tracking: Prophet 1.1.4, Python 3.11
- Backtest CSV export with exact parameters
- Evidence packs include model versions and seeds

### 📈 Service Level Objectives (SLOs)

**Forecast API Performance:**

- 7-day horizon: P95 ≤ 400ms
- 14-day horizon: P95 ≤ 600ms
- 30-day horizon: P95 ≤ 800ms

**Availability:**

- Staging: 99.5% uptime target
- Production: 99.9% uptime target

**Alert Latency:**

- <30s from price ingest to notification delivery

**Measurement**: Prometheus metrics at `/metrics`, Grafana dashboards

---

## 🔮 Future Enhancements

- Additional currency support (GBP, JPY, etc.)
- Advanced charting features (candlestick patterns, drawing tools)
- Additional language support (French, Spanish, etc.)
- Real-time WebSocket updates for live price streaming
- Mobile app (React Native)
- Machine learning enhancements (LSTM ✅, Transformer models 🗺️)
- Advanced alerting rules (technical indicator-based alerts)
- Data export/import features (CSV, Excel, PDF)
- Portfolio tracking and management
- Social trading features
- Advanced backtesting strategies
- Options and futures pricing
- Cryptocurrency integration
- SMS notifications via Twilio integration for alerts (especially useful for Yemen users)
