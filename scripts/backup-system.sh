#!/bin/bash

# Automated Backup System for Production Time Tracking Application
# This script handles database backups, file backups, and backup validation

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/timetracking"
DB_CONTAINER_NAME="timetracking_db"
APP_CONTAINER_NAME="timetracking_app"
RETENTION_DAYS=30
BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/var/log/backup-system.log"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"/{database,files,logs}

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Database backup function
backup_database() {
    log "Starting database backup..."
    
    local backup_file="$BACKUP_DIR/database/db_backup_$BACKUP_TIMESTAMP.sql"
    
    # Create database dump
    docker exec "$DB_CONTAINER_NAME" pg_dump -U postgres timetracking_db > "$backup_file"
    
    if [ $? -eq 0 ]; then
        log "Database backup completed: $backup_file"
        
        # Compress the backup
        gzip "$backup_file"
        log "Database backup compressed: ${backup_file}.gz"
    else
        log "ERROR: Database backup failed"
        return 1
    fi
}

# File backup function
backup_files() {
    log "Starting file backup..."
    
    local backup_file="$BACKUP_DIR/files/files_backup_$BACKUP_TIMESTAMP.tar.gz"
    
    # Backup application files and configuration
    tar -czf "$backup_file" \
        --exclude="node_modules" \
        --exclude=".git" \
        --exclude="dist" \
        --exclude="build" \
        /app/timetracking/ 2>/dev/null || true
    
    if [ $? -eq 0 ]; then
        log "File backup completed: $backup_file"
    else
        log "ERROR: File backup failed"
        return 1
    fi
}

# Backup validation function
validate_backup() {
    log "Validating backups..."
    
    local db_backup=$(ls -t "$BACKUP_DIR/database/"*_"$BACKUP_TIMESTAMP"* 2>/dev/null | head -1)
    local file_backup=$(ls -t "$BACKUP_DIR/files/"*_"$BACKUP_TIMESTAMP"* 2>/dev/null | head -1)
    
    # Validate database backup
    if [ -f "$db_backup" ] && [ -s "$db_backup" ]; then
        log "Database backup validation: PASSED"
    else
        log "ERROR: Database backup validation FAILED"
        return 1
    fi
    
    # Validate file backup
    if [ -f "$file_backup" ] && [ -s "$file_backup" ]; then
        log "File backup validation: PASSED"
    else
        log "ERROR: File backup validation FAILED"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Remove database backups older than retention period
    find "$BACKUP_DIR/database" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # Remove file backups older than retention period
    find "$BACKUP_DIR/files" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    log "Old backup cleanup completed"
}

# Health check function
health_check() {
    log "Performing health check..."
    
    # Check if containers are running
    if ! docker ps | grep -q "$DB_CONTAINER_NAME"; then
        log "ERROR: Database container is not running"
        return 1
    fi
    
    if ! docker ps | grep -q "$APP_CONTAINER_NAME"; then
        log "ERROR: Application container is not running"
        return 1
    fi
    
    # Check disk space
    local disk_usage=$(df "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 80 ]; then
        log "WARNING: Backup disk usage is $disk_usage%"
    fi
    
    log "Health check completed"
}

# Send notification function
send_notification() {
    local status=$1
    local message=$2
    
    # Log the notification
    log "NOTIFICATION [$status]: $message"
    
    # Here you can add email, Slack, or other notification integrations
    # Example for email (requires mail command):
    # echo "$message" | mail -s "Backup $status - Time Tracking System" admin@company.com
}

# Main backup execution
main() {
    log "Starting automated backup process..."
    
    # Perform health check first
    if ! health_check; then
        send_notification "FAILED" "Health check failed before backup"
        exit 1
    fi
    
    # Execute backups
    local backup_success=true
    
    if ! backup_database; then
        backup_success=false
    fi
    
    if ! backup_files; then
        backup_success=false
    fi
    
    if $backup_success && validate_backup; then
        cleanup_old_backups
        send_notification "SUCCESS" "Backup completed successfully at $BACKUP_TIMESTAMP"
        log "Backup process completed successfully"
    else
        send_notification "FAILED" "Backup process failed at $BACKUP_TIMESTAMP"
        log "ERROR: Backup process failed"
        exit 1
    fi
}

# Execute main function
main "$@"