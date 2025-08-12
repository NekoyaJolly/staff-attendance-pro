#!/bin/bash

# Backup metrics exporter script
# Generates Prometheus metrics for backup system monitoring

set -euo pipefail

BACKUP_DIR="/var/backups/timetracking"
METRICS_FILE="/tmp/backup_metrics.prom"
VALIDATION_REPORT="/var/log/backup-validation-report.json"

# Generate metrics
generate_metrics() {
    local timestamp=$(date +%s)
    
    # Clear previous metrics
    > "$METRICS_FILE"
    
    # Backup file counts and sizes
    local db_backup_count=$(find "$BACKUP_DIR/database" -name "*.sql.gz" -type f | wc -l)
    local file_backup_count=$(find "$BACKUP_DIR/files" -name "*.tar.gz" -type f | wc -l)
    
    echo "# HELP backup_database_count Number of database backup files" >> "$METRICS_FILE"
    echo "# TYPE backup_database_count gauge" >> "$METRICS_FILE"
    echo "backup_database_count $db_backup_count" >> "$METRICS_FILE"
    
    echo "# HELP backup_files_count Number of file backup files" >> "$METRICS_FILE"
    echo "# TYPE backup_files_count gauge" >> "$METRICS_FILE"
    echo "backup_files_count $file_backup_count" >> "$METRICS_FILE"
    
    # Latest backup timestamps
    local latest_db_backup=$(find "$BACKUP_DIR/database" -name "*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f1 | cut -d'.' -f1)
    local latest_file_backup=$(find "$BACKUP_DIR/files" -name "*.tar.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f1 | cut -d'.' -f1)
    
    if [ -n "$latest_db_backup" ]; then
        echo "# HELP backup_database_last_timestamp Timestamp of last database backup" >> "$METRICS_FILE"
        echo "# TYPE backup_database_last_timestamp gauge" >> "$METRICS_FILE"
        echo "backup_database_last_timestamp $latest_db_backup" >> "$METRICS_FILE"
    fi
    
    if [ -n "$latest_file_backup" ]; then
        echo "# HELP backup_files_last_timestamp Timestamp of last file backup" >> "$METRICS_FILE"
        echo "# TYPE backup_files_last_timestamp gauge" >> "$METRICS_FILE"
        echo "backup_files_last_timestamp $latest_file_backup" >> "$METRICS_FILE"
    fi
    
    # Disk usage metrics
    local total_bytes=$(df "$BACKUP_DIR" | awk 'NR==2 {print $2*1024}')
    local free_bytes=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4*1024}')
    local used_bytes=$((total_bytes - free_bytes))
    
    echo "# HELP backup_disk_total_bytes Total disk space for backups" >> "$METRICS_FILE"
    echo "# TYPE backup_disk_total_bytes gauge" >> "$METRICS_FILE"
    echo "backup_disk_total_bytes $total_bytes" >> "$METRICS_FILE"
    
    echo "# HELP backup_disk_free_bytes Free disk space for backups" >> "$METRICS_FILE"
    echo "# TYPE backup_disk_free_bytes gauge" >> "$METRICS_FILE"
    echo "backup_disk_free_bytes $free_bytes" >> "$METRICS_FILE"
    
    echo "# HELP backup_disk_used_bytes Used disk space for backups" >> "$METRICS_FILE"
    echo "# TYPE backup_disk_used_bytes gauge" >> "$METRICS_FILE"
    echo "backup_disk_used_bytes $used_bytes" >> "$METRICS_FILE"
    
    # Backup sizes
    local latest_db_file=$(find "$BACKUP_DIR/database" -name "*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    local latest_file_file=$(find "$BACKUP_DIR/files" -name "*.tar.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [ -n "$latest_db_file" ] && [ -f "$latest_db_file" ]; then
        local db_size=$(stat -c%s "$latest_db_file")
        echo "# HELP backup_database_size_bytes Size of latest database backup" >> "$METRICS_FILE"
        echo "# TYPE backup_database_size_bytes gauge" >> "$METRICS_FILE"
        echo "backup_database_size_bytes $db_size" >> "$METRICS_FILE"
    fi
    
    if [ -n "$latest_file_file" ] && [ -f "$latest_file_file" ]; then
        local file_size=$(stat -c%s "$latest_file_file")
        echo "# HELP backup_files_size_bytes Size of latest file backup" >> "$METRICS_FILE"
        echo "# TYPE backup_files_size_bytes gauge" >> "$METRICS_FILE"
        echo "backup_files_size_bytes $file_size" >> "$METRICS_FILE"
    fi
    
    # Validation metrics
    if [ -f "$VALIDATION_REPORT" ]; then
        local success_rate=$(jq -r '.summary.success_rate' "$VALIDATION_REPORT" 2>/dev/null | sed 's/%//' || echo "0")
        local total_backups=$(jq -r '.summary.total_backups' "$VALIDATION_REPORT" 2>/dev/null || echo "0")
        local valid_backups=$(jq -r '.summary.valid_backups' "$VALIDATION_REPORT" 2>/dev/null || echo "0")
        
        echo "# HELP backup_validation_success_rate Percentage of backups that passed validation" >> "$METRICS_FILE"
        echo "# TYPE backup_validation_success_rate gauge" >> "$METRICS_FILE"
        echo "backup_validation_success_rate $success_rate" >> "$METRICS_FILE"
        
        echo "# HELP backup_validation_total Total backups validated" >> "$METRICS_FILE"
        echo "# TYPE backup_validation_total gauge" >> "$METRICS_FILE"
        echo "backup_validation_total $total_backups" >> "$METRICS_FILE"
        
        echo "# HELP backup_validation_valid Valid backups found" >> "$METRICS_FILE"
        echo "# TYPE backup_validation_valid gauge" >> "$METRICS_FILE"
        echo "backup_validation_valid $valid_backups" >> "$METRICS_FILE"
    fi
    
    # Service status
    local backup_service_up=0
    if systemctl is-active --quiet cron 2>/dev/null || service cron status >/dev/null 2>&1; then
        backup_service_up=1
    fi
    
    echo "# HELP backup_service_up Backup service status (1=up, 0=down)" >> "$METRICS_FILE"
    echo "# TYPE backup_service_up gauge" >> "$METRICS_FILE"
    echo "backup_service_up $backup_service_up" >> "$METRICS_FILE"
    
    # Last successful backup timestamp (most recent successful backup)
    local last_success_timestamp=0
    if [ -n "$latest_db_backup" ] && [ -n "$latest_file_backup" ]; then
        if [ "$latest_db_backup" -ge "$latest_file_backup" ]; then
            last_success_timestamp=$latest_db_backup
        else
            last_success_timestamp=$latest_file_backup
        fi
    elif [ -n "$latest_db_backup" ]; then
        last_success_timestamp=$latest_db_backup
    elif [ -n "$latest_file_backup" ]; then
        last_success_timestamp=$latest_file_backup
    fi
    
    echo "# HELP backup_last_success_timestamp Timestamp of most recent successful backup" >> "$METRICS_FILE"
    echo "# TYPE backup_last_success_timestamp gauge" >> "$METRICS_FILE"
    echo "backup_last_success_timestamp $last_success_timestamp" >> "$METRICS_FILE"
}

# Serve metrics via HTTP
serve_metrics() {
    local port=${1:-9090}
    
    while true; do
        generate_metrics
        
        # Simple HTTP server response
        echo "HTTP/1.1 200 OK"
        echo "Content-Type: text/plain"
        echo "Content-Length: $(wc -c < "$METRICS_FILE")"
        echo ""
        cat "$METRICS_FILE"
    done | nc -l -p "$port" -q 1
}

# Main function
main() {
    local mode=${1:-generate}
    
    case $mode in
        "serve")
            local port=${2:-9090}
            echo "Starting metrics server on port $port..."
            serve_metrics "$port"
            ;;
        "generate")
            generate_metrics
            cat "$METRICS_FILE"
            ;;
        *)
            echo "Usage: $0 [generate|serve] [port]"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"