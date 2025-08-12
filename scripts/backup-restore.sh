#!/bin/bash

# Backup restoration script for Time Tracking System
# This script allows restoration of database and file backups

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/timetracking"
DB_CONTAINER_NAME="timetracking_db"
APP_CONTAINER_NAME="timetracking_app"
LOG_FILE="/var/log/backup-restore.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# List available backups
list_backups() {
    echo "Available Database Backups:"
    ls -la "$BACKUP_DIR/database/" | grep "\.sql\.gz$" | awk '{print $9, $5, $6, $7, $8}'
    echo ""
    echo "Available File Backups:"
    ls -la "$BACKUP_DIR/files/" | grep "\.tar\.gz$" | awk '{print $9, $5, $6, $7, $8}'
}

# Restore database function
restore_database() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log "ERROR: Backup file not found: $backup_file"
        return 1
    fi
    
    log "Starting database restoration from: $backup_file"
    
    # Stop application container temporarily
    docker stop "$APP_CONTAINER_NAME" || true
    
    # Create a backup of current database before restoration
    local current_backup="/tmp/current_db_backup_$(date +%Y%m%d_%H%M%S).sql"
    docker exec "$DB_CONTAINER_NAME" pg_dump -U postgres timetracking_db > "$current_backup"
    log "Current database backed up to: $current_backup"
    
    # Drop and recreate database
    docker exec "$DB_CONTAINER_NAME" psql -U postgres -c "DROP DATABASE IF EXISTS timetracking_db;"
    docker exec "$DB_CONTAINER_NAME" psql -U postgres -c "CREATE DATABASE timetracking_db;"
    
    # Restore from backup
    if [[ "$backup_file" == *.gz ]]; then
        zcat "$backup_file" | docker exec -i "$DB_CONTAINER_NAME" psql -U postgres timetracking_db
    else
        cat "$backup_file" | docker exec -i "$DB_CONTAINER_NAME" psql -U postgres timetracking_db
    fi
    
    if [ $? -eq 0 ]; then
        log "Database restoration completed successfully"
        # Restart application container
        docker start "$APP_CONTAINER_NAME"
        log "Application container restarted"
    else
        log "ERROR: Database restoration failed"
        # Attempt to restore from current backup
        cat "$current_backup" | docker exec -i "$DB_CONTAINER_NAME" psql -U postgres timetracking_db
        docker start "$APP_CONTAINER_NAME"
        return 1
    fi
}

# Restore files function
restore_files() {
    local backup_file=$1
    local restore_path=${2:-"/app/timetracking"}
    
    if [ ! -f "$backup_file" ]; then
        log "ERROR: Backup file not found: $backup_file"
        return 1
    fi
    
    log "Starting file restoration from: $backup_file"
    
    # Create backup of current files
    local current_backup="/tmp/current_files_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf "$current_backup" "$restore_path" 2>/dev/null || true
    log "Current files backed up to: $current_backup"
    
    # Stop application container
    docker stop "$APP_CONTAINER_NAME" || true
    
    # Extract backup
    tar -xzf "$backup_file" -C /
    
    if [ $? -eq 0 ]; then
        log "File restoration completed successfully"
        # Restart application container
        docker start "$APP_CONTAINER_NAME"
        log "Application container restarted"
    else
        log "ERROR: File restoration failed"
        # Restore current backup
        tar -xzf "$current_backup" -C /
        docker start "$APP_CONTAINER_NAME"
        return 1
    fi
}

# Interactive restoration menu
interactive_restore() {
    echo "=== Time Tracking System - Backup Restoration ==="
    echo ""
    echo "1. List available backups"
    echo "2. Restore database"
    echo "3. Restore files"
    echo "4. Full system restore"
    echo "5. Exit"
    echo ""
    read -p "Select an option (1-5): " choice
    
    case $choice in
        1)
            list_backups
            ;;
        2)
            echo ""
            list_backups
            echo ""
            read -p "Enter database backup filename: " db_backup
            restore_database "$BACKUP_DIR/database/$db_backup"
            ;;
        3)
            echo ""
            list_backups
            echo ""
            read -p "Enter file backup filename: " file_backup
            restore_files "$BACKUP_DIR/files/$file_backup"
            ;;
        4)
            echo ""
            list_backups
            echo ""
            read -p "Enter database backup filename: " db_backup
            read -p "Enter file backup filename: " file_backup
            restore_database "$BACKUP_DIR/database/$db_backup"
            restore_files "$BACKUP_DIR/files/$file_backup"
            ;;
        5)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo "Invalid option. Please try again."
            interactive_restore
            ;;
    esac
}

# Command line restore
cli_restore() {
    local restore_type=$1
    local backup_file=$2
    
    case $restore_type in
        "database"|"db")
            restore_database "$backup_file"
            ;;
        "files"|"file")
            restore_files "$backup_file"
            ;;
        *)
            echo "Usage: $0 cli <database|files> <backup_file_path>"
            exit 1
            ;;
    esac
}

# Main function
main() {
    if [ $# -eq 0 ]; then
        interactive_restore
    elif [ "$1" == "cli" ]; then
        if [ $# -ne 3 ]; then
            echo "Usage: $0 cli <database|files> <backup_file_path>"
            exit 1
        fi
        cli_restore "$2" "$3"
    elif [ "$1" == "list" ]; then
        list_backups
    else
        echo "Usage: $0 [cli <database|files> <backup_file_path>] [list]"
        echo "       $0 (for interactive mode)"
        exit 1
    fi
}

# Execute main function
main "$@"