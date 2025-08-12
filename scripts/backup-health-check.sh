#!/bin/bash

# Backup health check script for Time Tracking System
# Monitors backup system health and sends alerts

set -euo pipefail

BACKUP_DIR="/var/backups/timetracking"
LOG_FILE="/var/log/backup-health.log"
HEALTH_REPORT="/var/log/backup-health-report.json"
MAX_BACKUP_AGE_HOURS=26  # Alert if no backup in last 26 hours
MIN_DISK_SPACE_GB=10     # Alert if less than 10GB free space

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check recent backup availability
check_recent_backups() {
    local alert_count=0
    local latest_db_backup=""
    local latest_file_backup=""
    
    # Find latest database backup
    if [ -d "$BACKUP_DIR/database" ]; then
        latest_db_backup=$(find "$BACKUP_DIR/database" -name "*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    fi
    
    # Find latest file backup
    if [ -d "$BACKUP_DIR/files" ]; then
        latest_file_backup=$(find "$BACKUP_DIR/files" -name "*.tar.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    fi
    
    # Check database backup age
    if [ -n "$latest_db_backup" ] && [ -f "$latest_db_backup" ]; then
        local db_age_hours=$(echo "($(date +%s) - $(stat -c %Y "$latest_db_backup")) / 3600" | bc)
        if [ "$db_age_hours" -gt "$MAX_BACKUP_AGE_HOURS" ]; then
            log "ALERT: Latest database backup is $db_age_hours hours old (threshold: $MAX_BACKUP_AGE_HOURS hours)"
            alert_count=$((alert_count + 1))
        else
            log "Database backup age: $db_age_hours hours (OK)"
        fi
    else
        log "ALERT: No database backups found"
        alert_count=$((alert_count + 1))
    fi
    
    # Check file backup age
    if [ -n "$latest_file_backup" ] && [ -f "$latest_file_backup" ]; then
        local file_age_hours=$(echo "($(date +%s) - $(stat -c %Y "$latest_file_backup")) / 3600" | bc)
        if [ "$file_age_hours" -gt "$MAX_BACKUP_AGE_HOURS" ]; then
            log "ALERT: Latest file backup is $file_age_hours hours old (threshold: $MAX_BACKUP_AGE_HOURS hours)"
            alert_count=$((alert_count + 1))
        else
            log "File backup age: $file_age_hours hours (OK)"
        fi
    else
        log "ALERT: No file backups found"
        alert_count=$((alert_count + 1))
    fi
    
    return $alert_count
}

# Check disk space
check_disk_space() {
    local backup_partition=$(df "$BACKUP_DIR" | awk 'NR==2 {print $1}')
    local free_space_kb=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    local free_space_gb=$(echo "scale=2; $free_space_kb / 1024 / 1024" | bc)
    local used_percentage=$(df "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    log "Backup partition: $backup_partition"
    log "Free space: ${free_space_gb}GB"
    log "Used space: ${used_percentage}%"
    
    if (( $(echo "$free_space_gb < $MIN_DISK_SPACE_GB" | bc -l) )); then
        log "ALERT: Low disk space - only ${free_space_gb}GB remaining (threshold: ${MIN_DISK_SPACE_GB}GB)"
        return 1
    elif [ "$used_percentage" -gt 90 ]; then
        log "WARNING: Disk usage is ${used_percentage}% (high usage)"
        return 1
    else
        log "Disk space: OK"
        return 0
    fi
}

# Check backup service status
check_backup_services() {
    local service_issues=0
    
    # Check if cron service is running
    if ! systemctl is-active --quiet cron 2>/dev/null && ! service cron status >/dev/null 2>&1; then
        log "ALERT: Cron service is not running"
        service_issues=$((service_issues + 1))
    else
        log "Cron service: Running"
    fi
    
    # Check if backup scripts are executable
    local backup_script="/app/timetracking/scripts/backup-system.sh"
    if [ ! -x "$backup_script" ]; then
        log "ALERT: Backup script is not executable: $backup_script"
        service_issues=$((service_issues + 1))
    else
        log "Backup script permissions: OK"
    fi
    
    # Check docker containers
    local db_container="timetracking_db"
    local app_container="timetracking_app"
    
    if ! docker ps | grep -q "$db_container"; then
        log "ALERT: Database container is not running: $db_container"
        service_issues=$((service_issues + 1))
    else
        log "Database container: Running"
    fi
    
    if ! docker ps | grep -q "$app_container"; then
        log "ALERT: Application container is not running: $app_container"
        service_issues=$((service_issues + 1))
    else
        log "Application container: Running"
    fi
    
    return $service_issues
}

# Check backup directory permissions
check_backup_permissions() {
    local permission_issues=0
    
    # Check if backup directory exists and is writable
    if [ ! -d "$BACKUP_DIR" ]; then
        log "ALERT: Backup directory does not exist: $BACKUP_DIR"
        permission_issues=$((permission_issues + 1))
    elif [ ! -w "$BACKUP_DIR" ]; then
        log "ALERT: Backup directory is not writable: $BACKUP_DIR"
        permission_issues=$((permission_issues + 1))
    else
        log "Backup directory permissions: OK"
    fi
    
    # Check subdirectories
    for subdir in database files logs; do
        local full_path="$BACKUP_DIR/$subdir"
        if [ ! -d "$full_path" ]; then
            mkdir -p "$full_path" 2>/dev/null || {
                log "ALERT: Cannot create backup subdirectory: $full_path"
                permission_issues=$((permission_issues + 1))
            }
        elif [ ! -w "$full_path" ]; then
            log "ALERT: Backup subdirectory is not writable: $full_path"
            permission_issues=$((permission_issues + 1))
        fi
    done
    
    return $permission_issues
}

# Generate health report
generate_health_report() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local overall_status="healthy"
    local total_issues=0
    
    # Perform all health checks
    local backup_age_issues=0
    local disk_space_issues=0
    local service_issues=0
    local permission_issues=0
    
    check_recent_backups
    backup_age_issues=$?
    
    check_disk_space
    disk_space_issues=$?
    
    check_backup_services
    service_issues=$?
    
    check_backup_permissions
    permission_issues=$?
    
    total_issues=$((backup_age_issues + disk_space_issues + service_issues + permission_issues))
    
    if [ $total_issues -gt 0 ]; then
        overall_status="unhealthy"
    fi
    
    # Generate JSON report
    cat > "$HEALTH_REPORT" << EOF
{
  "timestamp": "$timestamp",
  "overall_status": "$overall_status",
  "total_issues": $total_issues,
  "checks": {
    "backup_age": {
      "status": "$([ $backup_age_issues -eq 0 ] && echo 'ok' || echo 'failed')",
      "issues": $backup_age_issues
    },
    "disk_space": {
      "status": "$([ $disk_space_issues -eq 0 ] && echo 'ok' || echo 'failed')",
      "issues": $disk_space_issues
    },
    "services": {
      "status": "$([ $service_issues -eq 0 ] && echo 'ok' || echo 'failed')",
      "issues": $service_issues
    },
    "permissions": {
      "status": "$([ $permission_issues -eq 0 ] && echo 'ok' || echo 'failed')",
      "issues": $permission_issues
    }
  },
  "metrics": {
    "free_space_gb": "$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}' | awk '{print $1/1024/1024}' | bc -l | cut -d'.' -f1)",
    "disk_usage_percent": "$(df "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')",
    "latest_backup_age_hours": "$([ -f "$(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.tar.gz" | head -1)" ] && echo "($(date +%s) - $(stat -c %Y "$(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.tar.gz" | head -1)")) / 3600" | bc || echo 'null')"
  }
}
EOF
    
    log "Health report generated: $HEALTH_REPORT"
    log "Overall system status: $overall_status ($total_issues issues)"
    
    return $total_issues
}

# Send health alert
send_health_alert() {
    local status=$1
    local issues=$2
    
    local message="Backup System Health Check - Status: $status"
    if [ $issues -gt 0 ]; then
        message="$message ($issues issues found)"
    fi
    
    log "HEALTH ALERT: $message"
    
    # Here you can add notification integrations
    # Example: Send to monitoring system, email, Slack, etc.
    
    # Log to syslog for system monitoring integration
    logger -t backup-health "$message"
}

# Main function
main() {
    log "Starting backup system health check..."
    
    # Generate health report and get total issues
    generate_health_report
    local total_issues=$?
    
    # Send alert if issues found
    if [ $total_issues -gt 0 ]; then
        send_health_alert "UNHEALTHY" $total_issues
    else
        log "All health checks passed"
    fi
    
    log "Health check completed"
    
    return $total_issues
}

# Execute main function
main "$@"