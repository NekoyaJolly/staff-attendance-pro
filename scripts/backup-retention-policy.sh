#!/bin/bash

# Advanced Backup Retention Policy Management
# Implements sophisticated backup retention strategies for the time tracking system

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/timetracking"
LOG_FILE="/var/log/backup-retention.log"
CONFIG_FILE="/etc/backup-retention.conf"

# Default retention policies (can be overridden by config file)
HOURLY_RETENTION_HOURS=24      # Keep hourly backups for 24 hours
DAILY_RETENTION_DAYS=30        # Keep daily backups for 30 days
WEEKLY_RETENTION_WEEKS=12      # Keep weekly backups for 12 weeks
MONTHLY_RETENTION_MONTHS=12    # Keep monthly backups for 12 months
YEARLY_RETENTION_YEARS=7       # Keep yearly backups for 7 years

# Critical data retention (compliance requirement)
CRITICAL_RETENTION_YEARS=10    # Keep critical employee data for 10 years

# Load configuration if exists
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [RETENTION] $1" | tee -a "$LOG_FILE"
}

# Create retention policy configuration
create_retention_config() {
    log "Creating backup retention policy configuration..."
    
    cat > "$CONFIG_FILE" << EOF
# Backup Retention Policy Configuration
# Time Tracking System - Production Environment

# Hourly backup retention (in hours)
HOURLY_RETENTION_HOURS=24

# Daily backup retention (in days)
DAILY_RETENTION_DAYS=30

# Weekly backup retention (in weeks)
WEEKLY_RETENTION_WEEKS=12

# Monthly backup retention (in months)
MONTHLY_RETENTION_MONTHS=12

# Yearly backup retention (in years)
YEARLY_RETENTION_YEARS=7

# Critical data retention for compliance (in years)
CRITICAL_RETENTION_YEARS=10

# Backup verification settings
VERIFY_BACKUPS=true
VERIFY_PERCENTAGE=100

# Storage optimization
COMPRESS_OLD_BACKUPS=true
COMPRESS_AFTER_DAYS=7

# Notification settings
NOTIFY_ON_RETENTION_ACTIONS=true
RETENTION_REPORT_EMAIL="admin@company.com"

# Archive settings
ARCHIVE_OLD_BACKUPS=true
ARCHIVE_AFTER_MONTHS=6
ARCHIVE_LOCATION="/var/archives/timetracking"

# Compliance settings
AUDIT_TRAIL=true
AUDIT_LOG="/var/log/backup-audit.log"
EOF

    log "Retention policy configuration created at $CONFIG_FILE"
}

# Apply hourly retention policy
apply_hourly_retention() {
    log "Applying hourly backup retention policy..."
    
    local cutoff_time=$(date -d "$HOURLY_RETENTION_HOURS hours ago" "+%Y%m%d_%H%M%S")
    local deleted_count=0
    
    # Find and remove hourly backups older than retention period
    for backup_file in "$BACKUP_DIR"/database/hourly_*.sql.gz; do
        if [ -f "$backup_file" ]; then
            local file_timestamp=$(basename "$backup_file" | grep -o '[0-9]\{8\}_[0-9]\{6\}')
            if [[ "$file_timestamp" < "$cutoff_time" ]]; then
                rm -f "$backup_file"
                log "Removed hourly backup: $(basename "$backup_file")"
                ((deleted_count++))
            fi
        fi
    done
    
    log "Hourly retention: Removed $deleted_count backup files"
}

# Apply daily retention policy
apply_daily_retention() {
    log "Applying daily backup retention policy..."
    
    local cutoff_date=$(date -d "$DAILY_RETENTION_DAYS days ago" "+%Y%m%d")
    local deleted_count=0
    local archived_count=0
    
    # Process daily backups
    for backup_file in "$BACKUP_DIR"/database/daily_*.sql.gz; do
        if [ -f "$backup_file" ]; then
            local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}')
            if [[ "$file_date" < "$cutoff_date" ]]; then
                # Archive before deletion if configured
                if [ "$ARCHIVE_OLD_BACKUPS" = "true" ]; then
                    archive_backup "$backup_file" "daily"
                    ((archived_count++))
                fi
                
                rm -f "$backup_file"
                log "Removed daily backup: $(basename "$backup_file")"
                ((deleted_count++))
            fi
        fi
    done
    
    log "Daily retention: Removed $deleted_count backups, Archived $archived_count backups"
}

# Apply weekly retention policy
apply_weekly_retention() {
    log "Applying weekly backup retention policy..."
    
    local cutoff_date=$(date -d "$WEEKLY_RETENTION_WEEKS weeks ago" "+%Y%m%d")
    local deleted_count=0
    
    for backup_file in "$BACKUP_DIR"/database/weekly_*.sql.gz; do
        if [ -f "$backup_file" ]; then
            local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}')
            if [[ "$file_date" < "$cutoff_date" ]]; then
                rm -f "$backup_file"
                log "Removed weekly backup: $(basename "$backup_file")"
                ((deleted_count++))
            fi
        fi
    done
    
    log "Weekly retention: Removed $deleted_count backup files"
}

# Apply monthly retention policy
apply_monthly_retention() {
    log "Applying monthly backup retention policy..."
    
    local cutoff_date=$(date -d "$MONTHLY_RETENTION_MONTHS months ago" "+%Y%m%d")
    local deleted_count=0
    
    for backup_file in "$BACKUP_DIR"/database/monthly_*.sql.gz; do
        if [ -f "$backup_file" ]; then
            local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}')
            if [[ "$file_date" < "$cutoff_date" ]]; then
                rm -f "$backup_file"
                log "Removed monthly backup: $(basename "$backup_file")"
                ((deleted_count++))
            fi
        fi
    done
    
    log "Monthly retention: Removed $deleted_count backup files"
}

# Apply yearly retention policy
apply_yearly_retention() {
    log "Applying yearly backup retention policy..."
    
    local cutoff_date=$(date -d "$YEARLY_RETENTION_YEARS years ago" "+%Y%m%d")
    local deleted_count=0
    
    for backup_file in "$BACKUP_DIR"/database/yearly_*.sql.gz; do
        if [ -f "$backup_file" ]; then
            local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}')
            if [[ "$file_date" < "$cutoff_date" ]]; then
                # Check if this is critical data that needs longer retention
                if is_critical_data "$backup_file"; then
                    apply_critical_retention "$backup_file"
                else
                    rm -f "$backup_file"
                    log "Removed yearly backup: $(basename "$backup_file")"
                    ((deleted_count++))
                fi
            fi
        fi
    done
    
    log "Yearly retention: Removed $deleted_count backup files"
}

# Apply critical data retention policy
apply_critical_retention() {
    local backup_file=$1
    local cutoff_date=$(date -d "$CRITICAL_RETENTION_YEARS years ago" "+%Y%m%d")
    local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}')
    
    if [[ "$file_date" < "$cutoff_date" ]]; then
        rm -f "$backup_file"
        log "Removed critical backup after $CRITICAL_RETENTION_YEARS years: $(basename "$backup_file")"
        audit_log "CRITICAL_DELETION" "$(basename "$backup_file")" "Deleted after $CRITICAL_RETENTION_YEARS years retention"
    else
        log "Preserving critical backup: $(basename "$backup_file")"
    fi
}

# Check if backup contains critical data
is_critical_data() {
    local backup_file=$1
    # Logic to determine if backup contains critical employee/payroll data
    # This would typically involve checking backup metadata or file patterns
    
    # For now, consider all employee and payroll related backups as critical
    if [[ "$(basename "$backup_file")" =~ (employee|payroll|salary|personal) ]]; then
        return 0  # true
    fi
    return 1  # false
}

# Archive old backups
archive_backup() {
    local backup_file=$1
    local backup_type=$2
    
    if [ "$ARCHIVE_OLD_BACKUPS" = "true" ]; then
        local archive_dir="$ARCHIVE_LOCATION/$backup_type"
        mkdir -p "$archive_dir"
        
        # Move backup to archive location
        mv "$backup_file" "$archive_dir/"
        log "Archived backup: $(basename "$backup_file") to $archive_dir"
        audit_log "ARCHIVE" "$(basename "$backup_file")" "Moved to archive: $archive_dir"
    fi
}

# Compress old backups for storage optimization
compress_old_backups() {
    if [ "$COMPRESS_OLD_BACKUPS" = "true" ]; then
        log "Compressing old backups for storage optimization..."
        
        local cutoff_date=$(date -d "$COMPRESS_AFTER_DAYS days ago" "+%Y%m%d")
        local compressed_count=0
        
        # Find uncompressed backups older than compression threshold
        for backup_file in "$BACKUP_DIR"/database/*.sql; do
            if [ -f "$backup_file" ]; then
                local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}')
                if [[ "$file_date" < "$cutoff_date" ]]; then
                    gzip "$backup_file"
                    log "Compressed backup: $(basename "$backup_file")"
                    ((compressed_count++))
                fi
            fi
        done
        
        log "Compressed $compressed_count backup files"
    fi
}

# Verify backup integrity before applying retention
verify_backup_integrity() {
    if [ "$VERIFY_BACKUPS" = "true" ]; then
        log "Verifying backup integrity before retention cleanup..."
        
        local verification_errors=0
        local total_backups=0
        
        # Verify database backups
        for backup_file in "$BACKUP_DIR"/database/*.sql.gz; do
            if [ -f "$backup_file" ]; then
                ((total_backups++))
                
                # Test if gzip file is valid
                if ! gzip -t "$backup_file" 2>/dev/null; then
                    log "ERROR: Corrupted backup detected: $(basename "$backup_file")"
                    ((verification_errors++))
                fi
            fi
        done
        
        log "Backup verification completed: $verification_errors errors in $total_backups backups"
        
        if [ $verification_errors -gt 0 ]; then
            log "WARNING: Found corrupted backups. Consider running backup repair."
            return 1
        fi
    fi
    
    return 0
}

# Generate retention policy report
generate_retention_report() {
    log "Generating backup retention policy report..."
    
    local report_file="/tmp/retention_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
BACKUP RETENTION POLICY REPORT
Generated: $(date)
System: Time Tracking Application

CURRENT RETENTION POLICIES:
- Hourly backups: ${HOURLY_RETENTION_HOURS} hours
- Daily backups: ${DAILY_RETENTION_DAYS} days
- Weekly backups: ${WEEKLY_RETENTION_WEEKS} weeks
- Monthly backups: ${MONTHLY_RETENTION_MONTHS} months
- Yearly backups: ${YEARLY_RETENTION_YEARS} years
- Critical data: ${CRITICAL_RETENTION_YEARS} years

CURRENT BACKUP INVENTORY:
EOF

    # Count backups by type
    local hourly_count=$(find "$BACKUP_DIR/database" -name "hourly_*.sql.gz" 2>/dev/null | wc -l)
    local daily_count=$(find "$BACKUP_DIR/database" -name "daily_*.sql.gz" 2>/dev/null | wc -l)
    local weekly_count=$(find "$BACKUP_DIR/database" -name "weekly_*.sql.gz" 2>/dev/null | wc -l)
    local monthly_count=$(find "$BACKUP_DIR/database" -name "monthly_*.sql.gz" 2>/dev/null | wc -l)
    local yearly_count=$(find "$BACKUP_DIR/database" -name "yearly_*.sql.gz" 2>/dev/null | wc -l)
    
    echo "- Hourly backups: $hourly_count files" >> "$report_file"
    echo "- Daily backups: $daily_count files" >> "$report_file"
    echo "- Weekly backups: $weekly_count files" >> "$report_file"
    echo "- Monthly backups: $monthly_count files" >> "$report_file"
    echo "- Yearly backups: $yearly_count files" >> "$report_file"
    
    # Calculate total storage usage
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "" >> "$report_file"
    echo "STORAGE USAGE: $total_size" >> "$report_file"
    
    log "Retention report generated: $report_file"
    
    # Send report via email if configured
    if [ "$NOTIFY_ON_RETENTION_ACTIONS" = "true" ] && [ -n "${RETENTION_REPORT_EMAIL:-}" ]; then
        cat "$report_file" | mail -s "Backup Retention Report - $(date +%Y-%m-%d)" "$RETENTION_REPORT_EMAIL" 2>/dev/null || true
    fi
}

# Audit logging function
audit_log() {
    local action=$1
    local target=$2
    local details=$3
    
    if [ "$AUDIT_TRAIL" = "true" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$action] $target: $details" >> "$AUDIT_LOG"
    fi
}

# Initialize retention system
initialize_retention_system() {
    log "Initializing backup retention system..."
    
    # Create necessary directories
    mkdir -p "$BACKUP_DIR"/{database,files,logs}
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$(dirname "$CONFIG_FILE")"
    
    if [ "$ARCHIVE_OLD_BACKUPS" = "true" ]; then
        mkdir -p "$ARCHIVE_LOCATION"/{hourly,daily,weekly,monthly,yearly}
    fi
    
    # Create configuration if it doesn't exist
    if [ ! -f "$CONFIG_FILE" ]; then
        create_retention_config
    fi
    
    log "Retention system initialized successfully"
}

# Main retention policy execution
main() {
    log "Starting backup retention policy execution..."
    
    # Initialize system
    initialize_retention_system
    
    # Verify backup integrity first
    if ! verify_backup_integrity; then
        log "WARNING: Backup integrity issues detected. Proceeding with caution."
    fi
    
    # Apply retention policies in order
    apply_hourly_retention
    apply_daily_retention
    apply_weekly_retention
    apply_monthly_retention
    apply_yearly_retention
    
    # Optimize storage
    compress_old_backups
    
    # Generate report
    generate_retention_report
    
    log "Backup retention policy execution completed successfully"
}

# Handle command line arguments
case "${1:-}" in
    "init")
        initialize_retention_system
        ;;
    "report")
        generate_retention_report
        ;;
    "verify")
        verify_backup_integrity
        ;;
    "config")
        create_retention_config
        ;;
    *)
        main "$@"
        ;;
esac