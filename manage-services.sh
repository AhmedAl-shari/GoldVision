#!/bin/bash

# GoldVision Service Management Script
# This script manages all GoldVision services with proper port handling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service ports
BACKEND_PORT=8000
FRONTEND_PORT=5173
PROPHET_PORT=8001
REDIS_PORT=6379

# PID files
PID_DIR="./pids"
BACKEND_PID="$PID_DIR/backend.pid"
FRONTEND_PID="$PID_DIR/frontend.pid"
PROPHET_PID="$PID_DIR/prophet.pid"

# Create PID directory
mkdir -p "$PID_DIR"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local service_name=$2
    if check_port $port; then
        echo -e "${YELLOW}Killing process on port $port ($service_name)...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to start backend
start_backend() {
    echo -e "${BLUE}Starting Backend Service...${NC}"
    kill_port $BACKEND_PORT "Backend"
    
    cd "/Users/ahmedalshari/Desktop/GoldVsion Project/goldvision"
    nohup node express-backend-enhanced.js > logs/backend.log 2>&1 &
    echo $! > $BACKEND_PID
    echo -e "${GREEN}Backend started on port $BACKEND_PORT (PID: $(cat $BACKEND_PID))${NC}"
}

# Function to start frontend
start_frontend() {
    echo -e "${BLUE}Starting Frontend Service...${NC}"
    kill_port $FRONTEND_PORT "Frontend"
    
    cd "/Users/ahmedalshari/Desktop/GoldVsion Project/goldvision/frontend"
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    echo $! > $FRONTEND_PID
    echo -e "${GREEN}Frontend started on port $FRONTEND_PORT (PID: $(cat $FRONTEND_PID))${NC}"
}

# Function to start prophet service
start_prophet() {
    echo -e "${BLUE}Starting Prophet Service...${NC}"
    kill_port $PROPHET_PORT "Prophet"
    
    cd "/Users/ahmedalshari/Desktop/GoldVsion Project/goldvision/prophet-service"
    nohup python3 -m uvicorn main:app --host 0.0.0.0 --port $PROPHET_PORT > ../logs/prophet.log 2>&1 &
    echo $! > $PROPHET_PID
    echo -e "${GREEN}Prophet started on port $PROPHET_PORT (PID: $(cat $PROPHET_PID))${NC}"
}

# Function to start Redis (if not running)
start_redis() {
    echo -e "${BLUE}Checking Redis...${NC}"
    if ! check_port $REDIS_PORT; then
        echo -e "${YELLOW}Redis not running, starting Redis...${NC}"
        redis-server --port $REDIS_PORT --daemonize yes
        echo -e "${GREEN}Redis started on port $REDIS_PORT${NC}"
    else
        echo -e "${GREEN}Redis already running on port $REDIS_PORT${NC}"
    fi
}

# Function to stop all services
stop_all() {
    echo -e "${RED}Stopping all GoldVision services...${NC}"
    
    # Stop by PID files
    for pid_file in $BACKEND_PID $FRONTEND_PID $PROPHET_PID; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            if kill -0 $pid 2>/dev/null; then
                echo -e "${YELLOW}Stopping service (PID: $pid)...${NC}"
                kill $pid 2>/dev/null || true
            fi
            rm -f "$pid_file"
        fi
    done
    
    # Kill by ports as backup
    kill_port $BACKEND_PORT "Backend"
    kill_port $FRONTEND_PORT "Frontend"
    kill_port $PROPHET_PORT "Prophet"
    
    echo -e "${GREEN}All services stopped${NC}"
}

# Function to check service status
status() {
    echo -e "${BLUE}GoldVision Service Status:${NC}"
    echo "================================"
    
    # Check backend
    if check_port $BACKEND_PORT; then
        echo -e "Backend:  ${GREEN}RUNNING${NC} (port $BACKEND_PORT)"
    else
        echo -e "Backend:  ${RED}STOPPED${NC}"
    fi
    
    # Check frontend
    if check_port $FRONTEND_PORT; then
        echo -e "Frontend: ${GREEN}RUNNING${NC} (port $FRONTEND_PORT)"
    else
        echo -e "Frontend: ${RED}STOPPED${NC}"
    fi
    
    # Check prophet
    if check_port $PROPHET_PORT; then
        echo -e "Prophet:  ${GREEN}RUNNING${NC} (port $PROPHET_PORT)"
    else
        echo -e "Prophet:  ${RED}STOPPED${NC}"
    fi
    
    # Check Redis
    if check_port $REDIS_PORT; then
        echo -e "Redis:    ${GREEN}RUNNING${NC} (port $REDIS_PORT)"
    else
        echo -e "Redis:    ${RED}STOPPED${NC}"
    fi
}

# Function to restart all services
restart_all() {
    echo -e "${YELLOW}Restarting all services...${NC}"
    stop_all
    sleep 3
    start_all
}

# Function to start all services
start_all() {
    echo -e "${GREEN}Starting GoldVision Services...${NC}"
    
    # Create logs directory
    mkdir -p logs
    
    # Start services in order
    start_redis
    start_backend
    sleep 5  # Wait for backend to initialize
    start_prophet
    sleep 3  # Wait for prophet to initialize
    start_frontend
    
    echo -e "${GREEN}All services started!${NC}"
    echo -e "${BLUE}Access the application at: http://localhost:$FRONTEND_PORT${NC}"
}

# Function to show logs
logs() {
    local service=${1:-"all"}
    
    case $service in
        "backend")
            tail -f logs/backend.log
            ;;
        "frontend")
            tail -f logs/frontend.log
            ;;
        "prophet")
            tail -f logs/prophet.log
            ;;
        "all")
            echo -e "${BLUE}Showing logs for all services (Ctrl+C to exit)...${NC}"
            tail -f logs/*.log
            ;;
        *)
            echo -e "${RED}Usage: $0 logs [backend|frontend|prophet|all]${NC}"
            ;;
    esac
}

# Main script logic
case "${1:-start}" in
    "start")
        start_all
        ;;
    "stop")
        stop_all
        ;;
    "restart")
        restart_all
        ;;
    "status")
        status
        ;;
    "logs")
        logs $2
        ;;
    "backend")
        start_backend
        ;;
    "frontend")
        start_frontend
        ;;
    "prophet")
        start_prophet
        ;;
    "redis")
        start_redis
        ;;
    *)
        echo -e "${BLUE}GoldVision Service Manager${NC}"
        echo "Usage: $0 {start|stop|restart|status|logs|backend|frontend|prophet|redis}"
        echo ""
        echo "Commands:"
        echo "  start     - Start all services"
        echo "  stop      - Stop all services"
        echo "  restart   - Restart all services"
        echo "  status    - Show service status"
        echo "  logs      - Show logs (optionally specify service)"
        echo "  backend   - Start only backend"
        echo "  frontend  - Start only frontend"
        echo "  prophet   - Start only prophet"
        echo "  redis     - Start only redis"
        ;;
esac
