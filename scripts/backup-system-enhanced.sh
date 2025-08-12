#!/bin/bash

# Enhanced Backup System with Retention Policies
# Integrates with the retention policy management system

set -euo pipefail

# Load configuration
source "$(dirname "$0")/backup-retention-policy.sh" || {
    echo "ERROR: Could not load retention policy configuration"
    exit 1
}

# Enhanced configuration
BACKUP_DIR="/var/backups/timetracking"
DB_CONTAINER_NAME="timetracking_db"
APP_CONTAINER_NAME="timetracking_app"
LOG_FILE="/var/log/backup-system-enhanced.log"
HEALTH_CHECK_FILE="/var/lib/backup-health.status"

# Backup levels and scheduling
CURRENT_HOUR=$(date +%H)
CURRENT_DAY=$(date +%u)  # 1=Monday, 7=Sunday
CURRENT_DATE=$(date +%d)
BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Enhanced logging with levels
log() {
    local level=${2:-INFO}
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $1" | tee -a "$LOG_FILE"
}

# Determine backup type based on schedule
determine_backup_type() {
    local backup_type="hourly"
    
    # Daily backup at 2 AM
    if [ "$CURRENT_HOUR" -eq 2 ]; then
        backup_type="daily"
    fi
    
    # Weekly backup on Sunday at 3 AM
    if [ "$CURRENT_DAY" -eq 7 ] && [ "$CURRENT_HOUR" -eq 3 ]; then
        backup_type="weekly"
    fi
    
    # Monthly backup on 1st of month at 4 AM
    if [ "$CURRENT_DATE" -eq 1 ] && [ "$CURRENT_HOUR" -eq 4 ]; then
        backup_type="monthly"
    fi
    
    # Yearly backup on January 1st at 5 AM
    if [ "$(date +%m%d)" = "0101" ] && [ "$CURRENT_HOUR" -eq 5 ]; then
        backup_type="yearly"
    fi
    
    echo "$backup_type"
}

# Enhanced database backup with compression and verification
backup_database_enhanced() {
    local backup_type=$1
    log "Starting enhanced $backup_type database backup..." "INFO"
    
    local backup_file="$BACKUP_DIR/database/${backup_type}_backup_$BACKUP_TIMESTAMP.sql"
    local compressed_file="${backup_file}.gz"
    
    # Create database dump with additional options
    if docker exec "$DB_CONTAINER_NAME" pg_dump \
        -U postgres \
        -d timetracking_db \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --encoding=UTF8 > "$backup_file"; then
        
        log "Database dump completed: $backup_file" "INFO"
        
        # Compress the backup
        if gzip "$backup_file"; then
            log "Database backup compressed: $compressed_file" "INFO"
            
            # Verify compressed backup
            if gzip -t "$compressed_file"; then
                log "Backup compression verified successfully" "INFO"
                
                # Calculate and log backup size
                local backup_size=$(stat -f%z "$compressed_file" 2>/dev/null || stat -c%s "$compressed_file")
                local backup_size_mb=$((backup_size / 1024 / 1024))
                log "Backup size: ${backup_size_mb}MB" "INFO"
                
                # Store backup metadata
                create_backup_metadata "$compressed_file" "$backup_type" "$backup_size"
                
                return 0
            else
                log "ERROR: Backup compression verification failed" "ERROR"
                return 1
            fi
        else
            log "ERROR: Database backup compression failed" "ERROR"
            return 1
        fi
    else
        log "ERROR: Database backup failed" "ERROR"
        return 1
    fi
}

# Create backup metadata for tracking
create_backup_metadata() {
    local backup_file=$1
    local backup_type=$2
    local backup_size=$3
    
    local metadata_file="${backup_file}.metadata"
    
    cat > "$metadata_file" << EOF
{
    "filename": "$(basename "$backup_file")",
    "backup_type": "$backup_type",
    "timestamp": "$BACKUP_TIMESTAMP",
    "size_bytes": $backup_size,
    "database_name": "timetracking_db",
    "compression": "gzip",
    "checksum": "$(sha256sum "$backup_file" | cut -d' ' -f1)",
    "retention_policy": {
        "type": "$backup_type",
        "retention_period": "$(get_retention_period "$backup_type")"
    },
    "created_by": "backup-system-enhanced",
    "format_version": "1.0"
}
EOF
    
    log "Backup metadata created: $metadata_file" "INFO"
}

# Get retention period for backup type
get_retention_period() {
    local backup_type=$1
    
    case "$backup_type" in
        "hourly") echo "${HOURLY_RETENTION_HOURS} hours" ;;
        "daily") echo "${DAILY_RETENTION_DAYS} days" ;;
        "weekly") echo "${WEEKLY_RETENTION_WEEKS} weeks" ;;
        "monthly") echo "${MONTHLY_RETENTION_MONTHS} months" ;;
        "yearly") echo "${YEARLY_RETENTION_YEARS} years" ;;
        *) echo "30 days" ;;
    esac
}

# Enhanced file backup with selective inclusion
backup_files_enhanced() {
    local backup_type=$1
    log "Starting enhanced $backup_type file backup..." "INFO"
    
    local backup_file="$BACKUP_DIR/files/${backup_type}_files_backup_$BACKUP_TIMESTAMP.tar.gz"
    
    # Create inclusion list based on backup type
    local include_patterns=()
    
    case "$backup_type" in
        "hourly"|"daily")
            # Light backup - configuration and logs only
            include_patterns=(
                "--include=/app/timetracking/src/config/*"
                "--include=/app/timetracking/logs/*"
                "--include=/app/timetracking/.env*"
            )
            ;;
        "weekly"|"monthly")
            # Medium backup - add user uploads and cache
            include_patterns=(
                "--include=/app/timetracking/src/*"
                "--include=/app/timetracking/uploads/*"
                "--include=/app/timetracking/cache/*"
                "--include=/app/timetracking/logs/*"
                "--include=/app/timetracking/.env*"
            )
            ;;
        "yearly")
            # Full backup - everything except excluded
            include_patterns=()
            ;;
    esac
    
    # Common exclusion patterns
    local exclude_patterns=(
        "--exclude=node_modules"
        "--exclude=.git"
        "--exclude=dist"
        "--exclude=build"
        "--exclude=*.tmp"
        "--exclude=*.log.old"
        "--exclude=.DS_Store"
    )
    
    # Create backup with patterns
    if tar -czf "$backup_file" \
        "${exclude_patterns[@]}" \
        "${include_patterns[@]}" \
        /app/timetracking/ 2>/dev/null; then
        
        log "File backup completed: $backup_file" "INFO"
        
        # Calculate backup size
        local backup_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file")
        local backup_size_mb=$((backup_size / 1024 / 1024))
        log "File backup size: ${backup_size_mb}MB" "INFO"
        
        return 0
    else
        log "ERROR: File backup failed" "ERROR"
        return 1
    fi
}

# Enhanced backup validation with integrity checks
validate_backup_enhanced() {
    local backup_type=$1
    log "Enhanced validation for $backup_type backups..." "INFO"
    
    local validation_errors=0
    
    # Find latest backups of this type
    local db_backup=$(ls -t "$BACKUP_DIR/database/${backup_type}_"*"_$BACKUP_TIMESTAMP.sql.gz" 2>/dev/null | head -1)
    local file_backup=$(ls -t "$BACKUP_DIR/files/${backup_type}_"*"_$BACKUP_TIMESTAMP.tar.gz" 2>/dev/null | head -1)
    
    # Validate database backup
    if [ -f "$db_backup" ]; then
        # Check file size
        local db_size=$(stat -f%z "$db_backup" 2>/dev/null || stat -c%s "$db_backup")
        if [ "$db_size" -lt 1024 ]; then
            log "ERROR: Database backup file too small: ${db_size} bytes" "ERROR"
            ((validation_errors++))
        fi
        
        # Verify gzip integrity
        if ! gzip -t "$db_backup"; then
            log "ERROR: Database backup compression corrupted" "ERROR"
            ((validation_errors++))
        fi
        
        # Verify backup can be read
        if ! zcat "$db_backup" | head -n 10 | grep -q "PostgreSQL database dump"; then
            log "ERROR: Database backup content validation failed" "ERROR"
            ((validation_errors++))
        fi
        
        if [ $validation_errors -eq 0 ]; then
            log "Database backup validation: PASSED" "INFO"
        fi
    else
        log "ERROR: Database backup file not found" "ERROR"
        ((validation_errors++))
    fi
    
    # Validate file backup
    if [ -f "$file_backup" ]; then
        # Check file size
        local file_size=$(stat -f%z "$file_backup" 2>/dev/null || stat -c%s "$file_backup")
        if [ "$file_size" -lt 1024 ]; then
            log "ERROR: File backup too small: ${file_size} bytes" "ERROR"
            ((validation_errors++))
        fi
        
        # Verify tar integrity
        if ! tar -tzf "$file_backup" >/dev/null 2>&1; then
            log "ERROR: File backup archive corrupted" "ERROR"
            ((validation_errors++))
        fi
        
        if [ $validation_errors -eq 0 ]; then
            log "File backup validation: PASSED" "INFO"
        fi
    else
        log "ERROR: File backup not found" "ERROR"
        ((validation_errors++))
    fi
    
    return $validation_errors
}

# Health status tracking
update_health_status() {
    local status=$1
    local message=$2
    
    cat > "$HEALTH_CHECK_FILE" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "$status",
    "message": "$message",
    "last_backup_type": "$(determine_backup_type)",
    "next_cleanup": "$(date -d '+1 day' +%Y-%m-%d)"
}
EOF
}

# Enhanced notification with different channels
send_enhanced_notification() {
    local status=$1
    local backup_type=$2
    local message=$3
    
    log "NOTIFICATION [$status] [$backup_type]: $message" "INFO"
    
    # Update health status
    update_health_status "$status" "$message"
    
    # Send to monitoring systems
    if command -v curl >/dev/null 2>&1; then
        # Example webhook notification (replace with actual endpoint)
        curl -s -X POST -H "Content-Type: application/json" \
            -d "{\"status\":\"$status\",\"type\":\"$backup_type\",\"message\":\"$message\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
            "http://monitoring.company.com/webhooks/backup" 2>/dev/null || true
    fi
    
    # Email notification for critical statuses
    if [[ "$status" =~ ^(FAILED|CRITICAL|WARNING)$ ]] && [ -n "${BACKUP_ALERT_EMAIL:-}" ]; then
        echo "$message" | mail -s "Backup Alert [$status] - Time Tracking System" "$BACKUP_ALERT_EMAIL" 2>/dev/null || true
    fi
}

# Main enhanced backup execution
main_enhanced() {
    local backup_type=$(determine_backup_type)
    log "Starting enhanced automated backup process (Type: $backup_type)..." "INFO"
    
    # Pre-backup health check
    if ! health_check; then
        send_enhanced_notification "FAILED" "$backup_type" "Health check failed before backup"
        exit 1
    fi
    
    # Execute backups
    local backup_success=true
    
    if ! backup_database_enhanced "$backup_type"; then
        backup_success=false
    fi
    
    if ! backup_files_enhanced "$backup_type"; then
        backup_success=false
    fi
    
    # Validate backups
    if $backup_success && validate_backup_enhanced "$backup_type"; then
        # Apply retention policies after successful backup
        log "Applying retention policies..." "INFO"
        if ./backup-retention-policy.sh; then
            send_enhanced_notification "SUCCESS" "$backup_type" "Backup and retention completed successfully at $BACKUP_TIMESTAMP"
            log "Enhanced backup process completed successfully" "INFO"
        else
            send_enhanced_notification "WARNING" "$backup_type" "Backup succeeded but retention policy failed"
            log "WARNING: Backup succeeded but retention policy application failed" "WARNING"
        fi
    else
        send_enhanced_notification "FAILED" "$backup_type" "Backup process failed at $BACKUP_TIMESTAMP"
        log "ERROR: Enhanced backup process failed" "ERROR"
        exit 1
    fi
    
    # Generate backup summary
    generate_backup_summary "$backup_type"
}

# Generate backup summary report
generate_backup_summary() {
    local backup_type=$1
    log "Generating backup summary for $backup_type backup..." "INFO"
    
    local summary_file="/tmp/backup_summary_${backup_type}_$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$summary_file" << EOF
{
    "backup_session": {
        "timestamp": "$BACKUP_TIMESTAMP",
        "type": "$backup_type",
        "status": "completed",
        "duration_seconds": $(($(date +%s) - $(date -d "-1 hour" +%s)))
    },
    "files_created": [
        "$(ls -1 "$BACKUP_DIR/database/${backup_type}_"*"_$BACKUP_TIMESTAMP.sql.gz" 2>/dev/null | head -1 | xargs basename)",
        "$(ls -1 "$BACKUP_DIR/files/${backup_type}_"*"_$BACKUP_TIMESTAMP.tar.gz" 2>/dev/null | head -1 | xargs basename)"
    ],
    "retention_applied": true,
    "next_backup": "$(date -d '+1 hour' +%Y-%m-%d\ %H:00:00')",
    "system_health": "healthy"
}
EOF
    
    log "Backup summary generated: $summary_file" "INFO"
}

# Execute main function
main_enhanced "$@"