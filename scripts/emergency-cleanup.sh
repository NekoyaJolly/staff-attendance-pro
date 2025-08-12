#!/bin/bash

# Emergency Backup Cleanup Script
# Handles disk space emergencies and prevents backup system failures

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/timetracking"
EMERGENCY_THRESHOLD=90  # Disk usage percentage to trigger emergency cleanup
CRITICAL_THRESHOLD=95   # Disk usage percentage for critical actions
LOG_FILE="/var/log/emergency-cleanup.log"
PRESERVE_CRITICAL_DAYS=7  # Always preserve backups from last N days

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [EMERGENCY] $1" | tee -a "$LOG_FILE"
}

# Check disk usage
get_disk_usage() {
    df "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//'
}

# Find and remove oldest non-critical backups
emergency_cleanup() {
    local current_usage=$(get_disk_usage)
    log "Emergency cleanup triggered - Current disk usage: ${current_usage}%"
    
    local cleaned_space=0
    local files_removed=0
    
    # Preserve recent backups (last PRESERVE_CRITICAL_DAYS days)
    local preserve_date=$(date -d "$PRESERVE_CRITICAL_DAYS days ago" "+%Y%m%d")
    
    # Remove oldest hourly backups first (beyond preservation period)
    for backup_file in $(find "$BACKUP_DIR/database" -name "hourly_*.sql.gz" -type f | sort); do
        local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}')
        if [[ "$file_date" < "$preserve_date" ]]; then
            local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file")
            rm -f "$backup_file"
            cleaned_space=$((cleaned_space + file_size))
            ((files_removed++))
            log "Emergency: Removed hourly backup $(basename "$backup_file") ($(( file_size / 1024 / 1024 ))MB)"
            
            # Check if we've freed enough space
            current_usage=$(get_disk_usage)
            if [ "$current_usage" -lt "$EMERGENCY_THRESHOLD" ]; then
                break
            fi
        fi
    done
    
    # If still over threshold, remove older daily backups
    if [ "$(get_disk_usage)" -ge "$EMERGENCY_THRESHOLD" ]; then
        for backup_file in $(find "$BACKUP_DIR/database" -name "daily_*.sql.gz" -type f | sort); do
            local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}')
            if [[ "$file_date" < "$preserve_date" ]]; then
                local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file")
                rm -f "$backup_file"
                cleaned_space=$((cleaned_space + file_size))
                ((files_removed++))
                log "Emergency: Removed daily backup $(basename "$backup_file") ($(( file_size / 1024 / 1024 ))MB)"
                
                current_usage=$(get_disk_usage)
                if [ "$current_usage" -lt "$EMERGENCY_THRESHOLD" ]; then
                    break
                fi
            fi
        done
    fi
    
    # If still critical, remove older weekly backups
    if [ "$(get_disk_usage)" -ge "$CRITICAL_THRESHOLD" ]; then
        for backup_file in $(find "$BACKUP_DIR/database" -name "weekly_*.sql.gz" -type f | sort); do
            local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}')
            if [[ "$file_date" < "$preserve_date" ]]; then
                local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file")
                rm -f "$backup_file"
                cleaned_space=$((cleaned_space + file_size))
                ((files_removed++))
                log "CRITICAL: Removed weekly backup $(basename "$backup_file") ($(( file_size / 1024 / 1024 ))MB)"
                
                current_usage=$(get_disk_usage)
                if [ "$current_usage" -lt "$CRITICAL_THRESHOLD" ]; then
                    break
                fi
            fi
        done
    fi
    
    log "Emergency cleanup completed: Removed $files_removed files, freed $(( cleaned_space / 1024 / 1024 ))MB"
    log "Final disk usage: $(get_disk_usage)%"
    
    # Send critical alert if still over threshold
    if [ "$(get_disk_usage)" -ge "$CRITICAL_THRESHOLD" ]; then
        send_critical_alert
    fi
}

# Send critical disk space alert
send_critical_alert() {
    local usage=$(get_disk_usage)
    local alert_message="CRITICAL: Backup disk usage at ${usage}% after emergency cleanup. Immediate intervention required."
    
    log "$alert_message"
    
    # Send to all available notification channels
    if [ -n "${EMERGENCY_ALERT_EMAIL:-}" ]; then
        echo "$alert_message" | mail -s "CRITICAL: Backup Disk Space Emergency" "$EMERGENCY_ALERT_EMAIL" 2>/dev/null || true
    fi
    
    # Write emergency status file
    echo "{\"status\":\"critical\",\"usage\":$usage,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"message\":\"$alert_message\"}" > "/var/lib/backup-emergency.status"
}

# Main execution
main() {
    local current_usage=$(get_disk_usage)
    
    if [ "$current_usage" -ge "$EMERGENCY_THRESHOLD" ]; then
        log "Disk usage at ${current_usage}% - Emergency cleanup required"
        emergency_cleanup
    else
        # Clean status file if exists
        rm -f "/var/lib/backup-emergency.status"
    fi
}

# Execute main function
main "$@"