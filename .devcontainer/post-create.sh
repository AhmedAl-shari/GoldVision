#!/bin/bash

echo "🚀 Setting up GoldVision development environment..."

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
cd prophet-service
pip install -r requirements.txt
cd ..

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npx playwright install

# Install Prisma CLI globally
echo "🗄️ Installing Prisma CLI..."
npm install -g prisma

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "📊 Running database migrations..."
npx prisma migrate dev --name init

# Seed the database
echo "🌱 Seeding database..."
node scripts/seed-database.js

# Install additional tools
echo "🛠️ Installing additional tools..."
npm install -g license-checker

# Create artifacts directory
echo "📁 Creating artifacts directory..."
mkdir -p artifacts/sbom

# Set up git hooks (optional)
echo "🔗 Setting up git hooks..."
chmod +x scripts/*.js

echo "✅ Development environment setup complete!"
echo ""
echo "🎉 You can now:"
echo "  - Run 'npm run dev' to start all services"
echo "  - Run 'make evidence' to collect API evidence"
echo "  - Run 'make perf-cold-warm' for performance testing"
echo "  - Run 'make reproduce' for research reproducibility"
echo ""
echo "📚 Available services:"
echo "  - Frontend: http://localhost:5173"
echo "  - Backend API: http://localhost:8000"
echo "  - Prophet Service: http://localhost:8001"
echo "  - API Docs: http://localhost:8000/docs"
