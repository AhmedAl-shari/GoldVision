#!/bin/bash

# GoldVision Database Restore Script (PostgreSQL)
# Restores a pg_dump plain SQL backup (.sql.gz) using DATABASE_URL

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🗄️  GoldVision Database Restore${NC}"
echo "=================================="

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ No backup file specified${NC}"
    echo "Usage: $0 <backup_file.tar.gz>"
    echo "Example: $0 backups/goldvision_backup_20250922_120000.tar.gz"
    echo "         $0 backups/latest_backup.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"
DATABASE_URL_VALUE="${DATABASE_URL:-}"

if [ -z "$DATABASE_URL_VALUE" ]; then
    echo -e "${RED}❌ DATABASE_URL is not set${NC}"
    echo "Please export DATABASE_URL before restoring:"
    echo "  export DATABASE_URL=postgresql://user:pass@host:5432/dbname"
    exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
    echo -e "${RED}❌ psql not found${NC}"
    echo "Install PostgreSQL client tools (psql/pg_dump) and try again."
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Backup file: $BACKUP_FILE${NC}"

# Basic connectivity check
echo -e "${YELLOW}🔍 Checking database connectivity...${NC}"
if ! psql "$DATABASE_URL_VALUE" -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to PostgreSQL using DATABASE_URL${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Database is reachable${NC}"

# Verify gzip file integrity
echo -e "${YELLOW}🔍 Verifying backup file...${NC}"
if ! gzip -t "$BACKUP_FILE" >/dev/null 2>&1; then
    echo -e "${RED}❌ Invalid backup file (not a valid .gz)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backup file is valid gzip${NC}"

echo -e "${YELLOW}⚠️  This will overwrite data in the target PostgreSQL database.${NC}"
echo -e "${YELLOW}   Make sure DATABASE_URL points to the correct DB.${NC}"

if [ "${FORCE:-0}" != "1" ]; then
    echo -e "${YELLOW}   Continue? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}ℹ️  Restore cancelled${NC}"
        exit 0
    fi
fi

echo -e "${YELLOW}📦 Restoring backup into PostgreSQL...${NC}"
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL_VALUE"

echo -e "${GREEN}✅ Database restore completed successfully!${NC}"
echo -e "   💡 Tip: set FORCE=1 to skip confirmation next time."