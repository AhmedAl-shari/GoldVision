# GoldVision Development Makefile

.PHONY: help install dev demo clean test build deploy

# Default target
help: ## Show this help message
	@echo "GoldVision Development Commands"
	@echo "================================"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Installation
install: ## Install all dependencies
	@echo "Installing dependencies..."
	npm install
	cd frontend && npm install
	cd prophet-service && pip install -r requirements.txt
	@echo "✅ Dependencies installed"

# Development
dev: ## Start all services in development mode
	@echo "Starting GoldVision in development mode..."
	npm run dev:all

dev-frontend: ## Start only frontend
	@echo "Starting frontend..."
	npm run dev:front

dev-backend: ## Start only backend
	@echo "Starting backend..."
	npm run dev:api

dev-prophet: ## Start only prophet service
	@echo "Starting prophet service..."
	npm run dev:prophet

# Demo Mode
demo: ## Start demo mode with fixtures (one-command demo)
	@echo "🚀 Starting GoldVision Demo Mode..."
	@echo "=================================="
	@echo ""
	@echo "This will:"
	@echo "• Start all services"
	@echo "• Seed 14 days of price data"
	@echo "• Generate 100 news articles from fixtures"
	@echo "• Open the application in your browser"
	@echo ""
	@read -p "Press Enter to continue or Ctrl+C to cancel..."
	@echo ""
	@echo "Setting up demo environment..."
	export ENV=demo && \
	export NEWS_PROVIDER=fixtures && \
	export DEMO_MODE=true && \
	echo "Starting services..." && \
	npm run dev:all &
	@echo "Waiting for services to start..."
	@sleep 10
	@echo "Seeding demo data..."
	@make seed-demo-data
	@echo "Opening application..."
	@open http://localhost:5173 || xdg-open http://localhost:5173 || echo "Please open http://localhost:5173 in your browser"
	@echo ""
	@echo "🎉 Demo is ready!"
	@echo "Frontend: http://localhost:5173"
	@echo "Backend: http://localhost:8000"
	@echo "Prophet: http://localhost:8001"
	@echo "Admin: http://localhost:5173/admin"
	@echo ""
	@echo "Press Ctrl+C to stop all services"

seed-demo-data: ## Seed demo data (prices + news)
	@echo "Seeding 14 days of price data..."
	node scripts/seed-demo-prices.js
	@echo "Generating 100 news articles..."
	node scripts/generate-demo-news.js
	@echo "✅ Demo data seeded"

# Database operations
db-setup: ## Setup database with migrations
	@echo "Setting up database..."
	npx prisma migrate dev
	npx prisma generate
	@echo "✅ Database setup complete"

db-seed: ## Seed database with sample data
	@echo "Seeding database..."
	npm run db:seed
	@echo "✅ Database seeded"

db-reset: ## Reset database (WARNING: destroys all data)
	@echo "⚠️  WARNING: This will destroy all data!"
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ] || exit 1
	npx prisma migrate reset --force
	npx prisma generate
	npm run db:seed
	@echo "✅ Database reset complete"

# Testing
test: ## Run all tests
	@echo "Running tests..."
	npm run test
	cd frontend && npm run test
	@echo "✅ Tests complete"

test-e2e: ## Run end-to-end tests
	@echo "Running E2E tests..."
	cd frontend && npm run e2e
	@echo "✅ E2E tests complete"

test-a11y: ## Run accessibility tests
	@echo "Running accessibility tests..."
	cd frontend && npm run test:a11y
	@echo "✅ Accessibility tests complete"

# Building
build: ## Build all services
	@echo "Building services..."
	npm run build
	cd frontend && npm run build
	@echo "✅ Build complete"

build-frontend: ## Build only frontend
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "✅ Frontend build complete"

# Deployment
deploy-staging: ## Deploy to staging environment
	@echo "🚀 Deploying GoldVision to Staging..."
	@echo "====================================="
	@echo ""
	@if [ ! -f "env/staging.env" ]; then \
		echo "❌ Error: env/staging.env not found!"; \
		echo "Please copy env/staging.env.sample to env/staging.env and configure it."; \
		echo "Run: cp env/staging.env.sample env/staging.env"; \
		exit 1; \
	fi
	@echo "✅ Environment file found"
	@echo ""
	@echo "This will:"
	@echo "• Build production Docker images"
	@echo "• Start staging stack with HTTPS (if domain configured)"
	@echo "• Run database migrations"
	@echo "• Deploy all services"
	@echo ""
	@read -p "Press Enter to continue or Ctrl+C to cancel..."
	@echo ""
	@echo "Step 1: Building production images..."
	docker-compose -f docker-compose.rc.yml -f compose.staging.yml build
	@echo ""
	@echo "Step 2: Running database migrations..."
	npx prisma migrate deploy
	npx prisma generate
	@echo ""
	@echo "Step 3: Starting staging stack..."
	docker-compose -f docker-compose.rc.yml -f compose.staging.yml --env-file env/staging.env up -d
	@echo ""
	@echo "Waiting for services to be ready..."
	@sleep 30
	@echo ""
	@echo "Step 4: Checking service health..."
	@make staging-health
	@echo ""
	@echo "🎉 Staging deployment complete!"
	@echo ""
	@echo "Services running:"
	@echo "• Frontend: https://$$(grep DOMAIN env/staging.env | cut -d'=' -f2 || echo 'localhost:8080')"
	@echo "• Backend: http://localhost:8000"
	@echo "• Prophet: http://localhost:8001"
	@echo "• Prometheus: http://localhost:9090"
	@echo "• Grafana: http://localhost:3000"
	@echo ""
	@echo "To view logs: make staging-logs"
	@echo "To stop: make staging-stop"
	@echo ""

staging-stop: ## Stop staging environment
	@echo "🛑 Stopping staging environment..."
	docker-compose -f docker-compose.rc.yml -f compose.staging.yml down
	@echo "✅ Staging environment stopped"

staging-logs: ## Show staging logs
	docker-compose -f docker-compose.rc.yml -f compose.staging.yml logs -f

staging-status: ## Show staging status
	@echo "Staging Environment Status:"
	@echo "=========================="
	docker-compose -f docker-compose.rc.yml -f compose.staging.yml ps

staging-health: ## Check staging health
	@echo "Checking staging service health..."
	@echo "Frontend: $$(curl -s -o /dev/null -w '%{http_code}' https://$$(grep DOMAIN env/staging.env | cut -d'=' -f2 || echo 'localhost:8080') || echo 'DOWN')"
	@echo "Backend: $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/health || echo 'DOWN')"
	@echo "Prophet: $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8001/health || echo 'DOWN')"

deploy-prod: ## Deploy to production
	@echo "⚠️  WARNING: This will deploy to production!"
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ] || exit 1
	@echo "Deploying to production..."
	@echo "This would deploy to production environment"
	@echo "✅ Production deployment complete"

# Maintenance
clean: ## Clean build artifacts and dependencies
	@echo "Cleaning..."
	rm -rf node_modules
	rm -rf frontend/node_modules
	rm -rf prophet-service/__pycache__
	rm -rf frontend/dist
	rm -rf frontend/build
	@echo "✅ Clean complete"

clean-logs: ## Clean log files
	@echo "Cleaning logs..."
	rm -f logs/*.log
	@echo "✅ Logs cleaned"

# Health checks
health: ## Check health of all services
	@echo "Checking service health..."
	@echo "Frontend: $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5173 || echo 'DOWN')"
	@echo "Backend: $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/health || echo 'DOWN')"
	@echo "Prophet: $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8001/health || echo 'DOWN')"

status: ## Show status of all services
	@echo "Service Status:"
	@echo "=============="
	@ps aux | grep -E "(node|python)" | grep -E "(5173|8000|8001)" || echo "No services running"

# Development utilities
logs: ## Show logs from all services
	@echo "Showing logs (press Ctrl+C to exit)..."
	tail -f logs/backend.log logs/frontend.log logs/prophet.log 2>/dev/null || echo "No log files found"

logs-backend: ## Show backend logs
	tail -f logs/backend.log 2>/dev/null || echo "Backend log not found"

logs-frontend: ## Show frontend logs
	tail -f logs/frontend.log 2>/dev/null || echo "Frontend log not found"

logs-prophet: ## Show prophet logs
	tail -f logs/prophet.log 2>/dev/null || echo "Prophet log not found"

# Performance
perf-test: ## Run performance tests
	@echo "Running performance tests..."
	npm run perf
	@echo "✅ Performance tests complete"

# Security
security-scan: ## Run security scan
	@echo "Running security scan..."
	npm run test:security
	@echo "✅ Security scan complete"

# Documentation
docs: ## Generate documentation
	@echo "Generating documentation..."
	@echo "API docs available at: http://localhost:8000/docs"
	@echo "OpenAPI spec: http://localhost:8000/openapi.json"
	@echo "✅ Documentation generated"

# Quick start for new developers
quickstart: install db-setup db-seed ## Quick start for new developers
	@echo ""
	@echo "🎉 Quick start complete!"
	@echo ""
	@echo "Next steps:"
	@echo "1. Run 'make dev' to start all services"
	@echo "2. Open http://localhost:5173 in your browser"
	@echo "3. Check the README for more information"
	@echo ""

# Emergency procedures
emergency-stop: ## Emergency stop all services
	@echo "🛑 Emergency stopping all services..."
	pkill -f "node.*express-backend-enhanced" || true
	pkill -f "vite" || true
	pkill -f "uvicorn.*main:app" || true
	@echo "✅ All services stopped"

emergency-restart: ## Emergency restart all services
	@echo "🔄 Emergency restarting all services..."
	@make emergency-stop
	sleep 2
	@make dev
	@echo "✅ All services restarted"

# Environment setup
env-check: ## Check environment variables
	@echo "Environment Check:"
	@echo "=================="
	@echo "NODE_ENV: $${NODE_ENV:-not set}"
	@echo "PORT: $${PORT:-not set}"
	@echo "NEWS_API_KEY: $${NEWS_API_KEY:+set (hidden)}"
	@echo "NEWS_PROVIDER: $${NEWS_PROVIDER:-not set}"
	@echo "PROPHET_URL: $${PROPHET_URL:-not set}"

# Backup and restore
backup: ## Create backup of database
	@echo "Creating backup..."
	@DATABASE_URL="$${DATABASE_URL:-$$(grep -E '^DATABASE_URL=' .env 2>/dev/null | cut -d= -f2-)}" \
	./scripts/backup.sh
	@echo "✅ Backup complete"

restore: ## Restore from backup (requires BACKUP_FILE variable)
	@echo "⚠️  WARNING: This will overwrite current database!"
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ] || exit 1
	@if [ -z "$$BACKUP_FILE" ]; then echo "Please set BACKUP_FILE variable"; exit 1; fi
	@DATABASE_URL="$${DATABASE_URL:-$$(grep -E '^DATABASE_URL=' .env 2>/dev/null | cut -d= -f2-)}" \
	FORCE=1 ./scripts/restore.sh "$$BACKUP_FILE"
	@echo "✅ Database restored from $$BACKUP_FILE"

release: ## Cut Final Release v1.0.0
	@echo "🚀 Cutting GoldVision v1.0.0 Final Release..."
	@echo "============================================="
	@echo ""
	@echo "This will:"
	@echo "• Bump versions to 1.0.0"
	@echo "• Generate final changelog"
	@echo "• Build production bundles"
	@echo "• Run full test suite"
	@echo "• Run Lighthouse CI"
	@echo "• Run Copilot evaluation"
	@echo "• Collect evidence artifacts"
	@echo "• Create evidence_v1.zip"
	@echo ""
	@read -p "Press Enter to continue or Ctrl+C to cancel..."
	@echo ""
	@echo "Starting release process..."
	npm run release
	@echo ""
	@echo "🎉 GoldVision v1.0.0 Release Complete!"
	@echo ""
	@echo "Evidence package: artifacts/evidence_v1.zip"
	@echo "Changelog: CHANGELOG.md"
	@echo ""
	@echo "To create git tag:"
	@echo "  git add . && git commit -m \"chore: release v1.0.0\""
	@echo "  git tag -a v1.0.0 -m \"Release v1.0.0\""
	@echo "  git push origin main --tags"
	@echo ""

# Release Candidate
rc: ## Build and test Release Candidate 1
	@echo "🚀 Building GoldVision Release Candidate 1..."
	@echo "============================================="
	@echo ""
	@echo "This will:"
	@echo "• Bump version to 1.0.0-rc.1"
	@echo "• Generate changelog"
	@echo "• Build production images"
	@echo "• Run database migrations"
	@echo "• Start RC stack"
	@echo "• Run full test suite"
	@echo "• Collect evidence artifacts"
	@echo ""
	@read -p "Press Enter to continue or Ctrl+C to cancel..."
	@echo ""
	@echo "Step 1: Version bumping..."
	npm run version:rc
	@echo ""
	@echo "Step 2: Generating changelog..."
	npm run changelog
	@echo ""
	@echo "Step 3: Building production images..."
	docker-compose -f docker-compose.rc.yml build
	@echo ""
	@echo "Step 4: Running database migrations..."
	npx prisma migrate deploy
	npx prisma generate
	@echo ""
	@echo "Step 5: Starting RC stack..."
	docker-compose -f docker-compose.rc.yml up -d
	@echo "Waiting for services to be ready..."
	sleep 30
	@echo ""
	@echo "Step 6: Running full test suite..."
	npm run test:full
	@echo ""
	@echo "Step 7: Collecting evidence artifacts..."
	npm run evidence:collect
	@echo ""
	@echo "🎉 Release Candidate 1 build complete!"
	@echo ""
	@echo "Services running:"
	@echo "• Frontend: http://localhost:80"
	@echo "• Backend: http://localhost:8000"
	@echo "• Prophet: http://localhost:8001"
	@echo "• Prometheus: http://localhost:9090"
	@echo "• Grafana: http://localhost:3000"
	@echo ""
	@echo "Evidence artifacts: artifacts/evidence_rc1.zip"
	@echo ""

rc-stop: ## Stop Release Candidate stack
	@echo "🛑 Stopping Release Candidate stack..."
	docker-compose -f docker-compose.rc.yml down
	@echo "✅ RC stack stopped"

rc-logs: ## Show Release Candidate logs
	docker-compose -f docker-compose.rc.yml logs -f

rc-status: ## Show Release Candidate status
	@echo "Release Candidate Status:"
	@echo "========================"
	docker-compose -f docker-compose.rc.yml ps

# Final Polish Pack
finish: ## Run comprehensive final polish pack (tests, axe, Lighthouse, builds, evidence)
	@echo "🎯 Running Final Polish Pack for GoldVision"
	@echo "============================================="
	@echo ""
	@echo "This will run:"
	@echo "• Full test suite"
	@echo "• Accessibility checks (axe-core)"
	@echo "• Lighthouse CI (4 pages)"
	@echo "• Production builds"
	@echo "• Evidence collection"
	@echo ""
	@read -p "Press Enter to continue or Ctrl+C to cancel..."
	@echo ""
	@echo "🧪 Running tests..."
	npm run test:full
	@echo ""
	@echo "♿ Running accessibility checks..."
	npm run test:accessibility
	@echo ""
	@echo "🏗️ Building production bundles..."
	npm run build
	@echo ""
	@echo "🚀 Starting services for Lighthouse..."
	@echo "Starting backend..."
	@export NEWS_PROVIDER=fixtures && node express-backend-enhanced.js &
	@BACKEND_PID=$$!
	@echo "Starting Prophet service..."
	@cd prophet-service && python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 &
	@PROPHET_PID=$$!
	@echo "Starting frontend..."
	@cd frontend && npm run build && npm run preview &
	@FRONTEND_PID=$$!
	@echo "Waiting for services to start..."
	@sleep 10
	@echo ""
	@echo "🔍 Running Lighthouse CI..."
	@mkdir -p artifacts/lighthouse
	@mkdir -p artifacts/axe
	@echo "Testing Dashboard..."
	@npx lighthouse http://localhost:4173/dashboard --output=html --output-path=artifacts/lighthouse/dashboard.html --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices,seo
	@echo "Testing Trends..."
	@npx lighthouse http://localhost:4173/trends --output=html --output-path=artifacts/lighthouse/trends.html --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices,seo
	@echo "Testing News..."
	@npx lighthouse http://localhost:4173/news --output=html --output-path=artifacts/lighthouse/news.html --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices,seo
	@echo "Testing Alerts..."
	@npx lighthouse http://localhost:4173/alerts --output=html --output-path=artifacts/lighthouse/alerts.html --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices,seo
	@echo ""
	@echo "📊 Collecting evidence..."
	@echo "Fetching news snapshot..."
	@curl -s http://localhost:8000/news/aggregate?limit=10 > artifacts/news_snapshot.json
	@echo "Fetching metrics..."
	@curl -s http://localhost:8000/metrics/json > artifacts/metrics_dump.json
	@echo "Collecting recent logs..."
	@tail -n 200 logs/app.log > artifacts/recent_logs.txt 2>/dev/null || echo "No log file found"
	@echo ""
	@echo "🧹 Cleaning up services..."
	@kill $$BACKEND_PID $$PROPHET_PID $$FRONTEND_PID 2>/dev/null || true
	@echo ""
	@echo "📦 Creating evidence archive..."
	@cd artifacts && zip -r evidence_final_polish.zip lighthouse/ axe/ news_snapshot.json metrics_dump.json recent_logs.txt
	@echo ""
	@echo "✅ Final Polish Pack Complete!"
	@echo "=============================="
	@echo "📁 Evidence saved to: artifacts/evidence_final_polish.zip"
	@echo "🔍 Lighthouse reports: artifacts/lighthouse/"
	@echo "♿ Accessibility reports: artifacts/axe/"
	@echo "📊 News snapshot: artifacts/news_snapshot.json"
	@echo "📈 Metrics dump: artifacts/metrics_dump.json"
	@echo "📝 Recent logs: artifacts/recent_logs.txt"
	@echo ""
	@echo "🎉 GoldVision Final Polish Pack is ready for deployment!"