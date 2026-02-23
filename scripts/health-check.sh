#!/bin/bash

# GoldVision Comprehensive Health Check Script
# This script performs a full health check of the GoldVision application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL=${API_URL:-"http://localhost:8000"}
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:3000"}
TIMEOUT=${TIMEOUT:-30}

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to print status
print_status() {
    local status=$1
    local message=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $message"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC}: $message"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    else
        echo -e "${YELLOW}⚠️  WARN${NC}: $message"
    fi
}

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3
    
    if curl -s -f -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" | grep -q "$expected_status"; then
        print_status "PASS" "$description"
        return 0
    else
        print_status "FAIL" "$description (HTTP $?)"
        return 1
    fi
}

# Function to check JSON response
check_json_endpoint() {
    local url=$1
    local expected_field=$2
    local description=$3
    
    response=$(curl -s --max-time $TIMEOUT "$url" 2>/dev/null)
    if [ $? -eq 0 ] && echo "$response" | jq -e ".$expected_field" > /dev/null 2>&1; then
        print_status "PASS" "$description"
        return 0
    else
        print_status "FAIL" "$description (Invalid JSON or missing field)"
        return 1
    fi
}

# Function to check Docker containers
check_docker_containers() {
    echo -e "\n${BLUE}🐳 Checking Docker Containers${NC}"
    
    # Check if containers are running
    if docker-compose ps | grep -q "Up"; then
        print_status "PASS" "Docker containers are running"
    else
        print_status "FAIL" "Docker containers are not running"
        return 1
    fi
    
    # Check specific containers
    if docker-compose ps backend | grep -q "Up"; then
        print_status "PASS" "Backend container is running"
    else
        print_status "FAIL" "Backend container is not running"
    fi
    
    if docker-compose ps frontend | grep -q "Up"; then
        print_status "PASS" "Frontend container is running"
    else
        print_status "FAIL" "Frontend container is not running"
    fi
}

# Function to check API endpoints
check_api_endpoints() {
    echo -e "\n${BLUE}🔌 Checking API Endpoints${NC}"
    
    # Health check
    check_endpoint "$API_URL/health" 200 "Health endpoint"
    
    # Metrics endpoint
    check_json_endpoint "$API_URL/metrics" "uptime_seconds" "Metrics endpoint"
    
    # Tasks endpoint
    check_json_endpoint "$API_URL/tasks" "fetch_latest_price" "Tasks endpoint"
    
    # Prices endpoint
    check_json_endpoint "$API_URL/prices" "prices" "Prices endpoint"
    
    # Alerts endpoint
    check_json_endpoint "$API_URL/alerts" "alerts" "Alerts endpoint"
}

# Function to check forecast functionality
check_forecast_functionality() {
    echo -e "\n${BLUE}📊 Checking Forecast Functionality${NC}"
    
    # Test forecast generation
    response=$(curl -s -X POST "$API_URL/forecast" \
        -H "Content-Type: application/json" \
        -d '{"horizon_days": 7, "include_history": false}' \
        --max-time $TIMEOUT 2>/dev/null)
    
    if [ $? -eq 0 ] && echo "$response" | jq -e '.forecast' > /dev/null 2>&1; then
        forecast_count=$(echo "$response" | jq '.forecast | length')
        if [ "$forecast_count" -eq 7 ]; then
            print_status "PASS" "Forecast generation (7 days)"
        else
            print_status "FAIL" "Forecast generation (expected 7 days, got $forecast_count)"
        fi
    else
        print_status "FAIL" "Forecast generation (API error)"
    fi
}

# Function to check price fetch functionality
check_price_fetch() {
    echo -e "\n${BLUE}💰 Checking Price Fetch Functionality${NC}"
    
    # Test price fetch
    response=$(curl -s -X POST "$API_URL/fetch-latest" --max-time $TIMEOUT 2>/dev/null)
    
    if [ $? -eq 0 ] && echo "$response" | jq -e '.price' > /dev/null 2>&1; then
        print_status "PASS" "Price fetch functionality"
    else
        print_status "FAIL" "Price fetch functionality (API error)"
    fi
}

# Function to check frontend
check_frontend() {
    echo -e "\n${BLUE}🌐 Checking Frontend${NC}"
    
    if [ -n "$FRONTEND_URL" ]; then
        check_endpoint "$FRONTEND_URL" 200 "Frontend accessibility"
    else
        print_status "WARN" "Frontend URL not configured, skipping frontend check"
    fi
}

# Function to check database connectivity
check_database() {
    echo -e "\n${BLUE}🗄️  Checking Database${NC}"
    
    # Check if we can connect to the database through the API
    response=$(curl -s "$API_URL/prices?limit=1" --max-time $TIMEOUT 2>/dev/null)
    
    if [ $? -eq 0 ] && echo "$response" | jq -e '.prices' > /dev/null 2>&1; then
        print_status "PASS" "Database connectivity"
    else
        print_status "FAIL" "Database connectivity"
    fi
}

# Function to check scheduled tasks
check_scheduled_tasks() {
    echo -e "\n${BLUE}⏰ Checking Scheduled Tasks${NC}"
    
    response=$(curl -s "$API_URL/tasks" --max-time $TIMEOUT 2>/dev/null)
    
    if [ $? -eq 0 ] && echo "$response" | jq -e '.fetch_latest_price' > /dev/null 2>&1; then
        task_status=$(echo "$response" | jq -r '.fetch_latest_price.success_rate')
        if [ "$task_status" != "null" ]; then
            print_status "PASS" "Scheduled tasks are configured"
        else
            print_status "WARN" "Scheduled tasks configured but no runs yet"
        fi
    else
        print_status "FAIL" "Scheduled tasks not accessible"
    fi
}

# Function to check performance metrics
check_performance() {
    echo -e "\n${BLUE}⚡ Checking Performance Metrics${NC}"
    
    response=$(curl -s "$API_URL/metrics" --max-time $TIMEOUT 2>/dev/null)
    
    if [ $? -eq 0 ] && echo "$response" | jq -e '.requests_success_rate' > /dev/null 2>&1; then
        success_rate=$(echo "$response" | jq -r '.requests_success_rate')
        avg_response_time=$(echo "$response" | jq -r '.requests_duration_avg_ms')
        
        # Check success rate (should be > 95%)
        if (( $(echo "$success_rate > 0.95" | bc -l) )); then
            print_status "PASS" "Request success rate: $(echo "$success_rate * 100" | bc -l | cut -d. -f1)%"
        else
            print_status "WARN" "Request success rate: $(echo "$success_rate * 100" | bc -l | cut -d. -f1)% (should be > 95%)"
        fi
        
        # Check average response time (should be < 2000ms)
        if (( $(echo "$avg_response_time < 2000" | bc -l) )); then
            print_status "PASS" "Average response time: ${avg_response_time}ms"
        else
            print_status "WARN" "Average response time: ${avg_response_time}ms (should be < 2000ms)"
        fi
    else
        print_status "FAIL" "Performance metrics not accessible"
    fi
}

# Main health check function
main() {
    echo -e "${BLUE}🏥 GoldVision Health Check${NC}"
    echo -e "API URL: $API_URL"
    echo -e "Frontend URL: $FRONTEND_URL"
    echo -e "Timeout: ${TIMEOUT}s"
    echo -e "Timestamp: $(date)"
    echo -e "========================================\n"
    
    # Run all checks
    check_docker_containers
    check_api_endpoints
    check_database
    check_forecast_functionality
    check_price_fetch
    check_scheduled_tasks
    check_performance
    check_frontend
    
    # Summary
    echo -e "\n${BLUE}📊 Health Check Summary${NC}"
    echo -e "========================================"
    echo -e "Total Checks: $TOTAL_CHECKS"
    echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
    echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
    echo -e "Warnings: ${YELLOW}$((TOTAL_CHECKS - PASSED_CHECKS - FAILED_CHECKS))${NC}"
    
    # Exit code based on results
    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All critical checks passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}💥 Some checks failed!${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
