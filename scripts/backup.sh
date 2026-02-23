#!/bin/bash

# GoldVision Database Backup Script (PostgreSQL)
# Creates a compressed pg_dump backup using DATABASE_URL

set -e

# Configuration
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="goldvision_pg_backup_${TIMESTAMP}.sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🗄️  GoldVision Database Backup (PostgreSQL)${NC}"
echo "=================================="

# Require DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${RED}❌ DATABASE_URL is not set${NC}"
    echo "Please export DATABASE_URL or create a .env and source it before running:"
    echo "  export DATABASE_URL=postgresql://user:pass@host:5432/dbname"
    exit 1
fi

# Require pg_dump
if ! command -v pg_dump >/dev/null 2>&1; then
    echo -e "${RED}❌ pg_dump not found${NC}"
    echo "Install PostgreSQL client tools (pg_dump/psql) and try again."
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}🔍 Checking database connectivity...${NC}"
if ! pg_dump --schema-only "$DATABASE_URL" >/dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to PostgreSQL using DATABASE_URL${NC}"
    echo "Please verify your DATABASE_URL and that Postgres is running."
    exit 1
fi
echo -e "${GREEN}✅ Database is reachable${NC}"

# Create backup
echo -e "${YELLOW}📦 Creating pg_dump backup...${NC}"
mkdir -p "$BACKUP_DIR"

# Use plain SQL so it's easy to restore with psql
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/$BACKUP_NAME"

if [ -f "$BACKUP_DIR/$BACKUP_NAME" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
    echo -e "${GREEN}✅ Backup created successfully${NC}"
    echo -e "   📁 File: $BACKUP_DIR/$BACKUP_NAME"
    echo -e "   📊 Size: $BACKUP_SIZE"

    ln -sf "$BACKUP_NAME" "$BACKUP_DIR/latest_backup.sql.gz"
    echo -e "   🔗 Latest: $BACKUP_DIR/latest_backup.sql.gz"
else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 Backup completed successfully!${NC}"
echo -e "   💡 To restore: DATABASE_URL=... ./scripts/restore.sh $BACKUP_DIR/$BACKUP_NAME"