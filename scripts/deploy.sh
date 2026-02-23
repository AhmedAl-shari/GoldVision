#!/bin/bash

# GoldVision Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
API_URL=${2:-http://localhost:8000}

echo -e "${GREEN}🚀 Starting GoldVision deployment to ${ENVIRONMENT}${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Build and start services
echo -e "${YELLOW}🔨 Building and starting services...${NC}"

if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f docker-compose.yaml up -d --build
else
    docker-compose -f docker-compose.dev.yaml up -d --build
fi

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Health checks
echo -e "${YELLOW}🏥 Running health checks...${NC}"

# Check backend health
echo "Checking backend health..."
if curl -f -s "$API_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    exit 1
fi

# Check forecast endpoint
echo "Checking forecast endpoint..."
if curl -f -s -X POST "$API_URL/forecast" \
    -H "Content-Type: application/json" \
    -d '{"horizon_days":7}' > /dev/null; then
    echo -e "${GREEN}✅ Forecast endpoint is working${NC}"
else
    echo -e "${RED}❌ Forecast endpoint check failed${NC}"
    exit 1
fi

# Seed database if needed
echo -e "${YELLOW}🌱 Seeding database...${NC}"
if [ -f "prices_seed.csv" ]; then
    # Use the seed script or API endpoint
    echo "Seeding with sample data..."
    # Add your seeding logic here
else
    echo "No seed data found, skipping..."
fi

echo -e "${GREEN}🎉 Deployment to ${ENVIRONMENT} completed successfully!${NC}"
echo -e "${GREEN}📊 Backend API: ${API_URL}${NC}"
echo -e "${GREEN}🌐 Frontend: http://localhost:3000${NC}"

# Show running containers
echo -e "${YELLOW}📦 Running containers:${NC}"
docker-compose ps
