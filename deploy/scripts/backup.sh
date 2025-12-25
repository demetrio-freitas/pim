#!/bin/bash
# ===========================================
# PIM System - Database Backup Script
# ===========================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/var/backups/pim"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Load environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/../.env.production" ]; then
    source "$SCRIPT_DIR/../.env.production"
fi

# Required variables
: "${DATABASE_HOST:?DATABASE_HOST is required}"
: "${DATABASE_PORT:?DATABASE_PORT is required}"
: "${DATABASE_NAME:?DATABASE_NAME is required}"
: "${DATABASE_USER:?DATABASE_USER is required}"
: "${DATABASE_PASSWORD:?DATABASE_PASSWORD is required}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Backup PostgreSQL
backup_postgres() {
    log_info "Starting PostgreSQL backup..."

    BACKUP_FILE="$BACKUP_DIR/pim_postgres_${DATE}.sql.gz"

    PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
        -h "$DATABASE_HOST" \
        -p "$DATABASE_PORT" \
        -U "$DATABASE_USER" \
        -d "$DATABASE_NAME" \
        --no-owner \
        --no-acl \
        -Fc | gzip > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        log_info "PostgreSQL backup completed: $BACKUP_FILE"
        log_info "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    else
        log_error "PostgreSQL backup failed!"
        return 1
    fi
}

# Backup Redis (if RDB enabled)
backup_redis() {
    log_info "Starting Redis backup..."

    if [ -n "$REDIS_HOST" ]; then
        # Trigger BGSAVE
        redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" \
            ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} BGSAVE

        log_info "Redis BGSAVE triggered"
    else
        log_info "Redis backup skipped (no host configured)"
    fi
}

# Upload to S3 (optional)
upload_to_s3() {
    if [ -n "$S3_BUCKET" ] && [ -n "$S3_ACCESS_KEY" ]; then
        log_info "Uploading backup to S3..."

        aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/backups/postgres/" \
            --endpoint-url "$S3_ENDPOINT"

        log_info "Upload complete"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."

    find "$BACKUP_DIR" -name "pim_*.sql.gz" -mtime +$RETENTION_DAYS -delete

    log_info "Cleanup complete"
}

# Main
main() {
    log_info "=== PIM Backup Started ==="

    backup_postgres
    backup_redis
    upload_to_s3
    cleanup_old_backups

    log_info "=== PIM Backup Completed ==="
}

main "$@"
