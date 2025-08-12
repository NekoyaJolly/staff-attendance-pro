#!/bin/bash

# Backup validation script for Time Tracking System
# Validates backup integrity and generates reports

set -euo pipefail

BACKUP_DIR="/var/backups/timetracking"
LOG_FILE="/var/log/backup-validation.log"
VALIDATION_REPORT="/var/log/backup-validation-report.json"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Validate database backup
validate_database_backup() {
    local backup_file=$1
    local test_result=0
    
    log "Validating database backup: $backup_file"
    
    # Check file exists and is not empty
    if [ ! -f "$backup_file" ] || [ ! -s "$backup_file" ]; then
        log "ERROR: Database backup file is missing or empty"
        return 1
    fi
    
    # For compressed files, test decompression
    if [[ "$backup_file" == *.gz ]]; then
        if ! gzip -t "$backup_file" 2>/dev/null; then
            log "ERROR: Database backup file is corrupted (gzip test failed)"
            return 1
        fi
    fi
    
    # Test SQL syntax by attempting to parse (without execution)
    local temp_file="/tmp/backup_test_$(date +%s).sql"
    
    if [[ "$backup_file" == *.gz ]]; then
        zcat "$backup_file" > "$temp_file"
    else
        cp "$backup_file" "$temp_file"
    fi
    
    # Basic SQL validation - check for required tables
    if grep -q "CREATE TABLE.*users" "$temp_file" && \
       grep -q "CREATE TABLE.*time_records" "$temp_file" && \
       grep -q "CREATE TABLE.*shifts" "$temp_file"; then
        log "Database backup validation: PASSED"
        test_result=0
    else
        log "ERROR: Database backup validation: FAILED (missing required tables)"
        test_result=1
    fi
    
    rm -f "$temp_file"
    return $test_result
}

# Validate file backup
validate_file_backup() {
    local backup_file=$1
    
    log "Validating file backup: $backup_file"
    
    # Check file exists and is not empty
    if [ ! -f "$backup_file" ] || [ ! -s "$backup_file" ]; then
        log "ERROR: File backup is missing or empty"
        return 1
    fi
    
    # Test tar file integrity
    if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
        log "ERROR: File backup is corrupted (tar test failed)"
        return 1
    fi
    
    # Check for essential files in backup
    local essential_files=("package.json" "src/App.tsx" "src/main.tsx")
    local missing_files=()
    
    for file in "${essential_files[@]}"; do
        if ! tar -tzf "$backup_file" | grep -q "$file"; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        log "File backup validation: PASSED"
        return 0
    else
        log "ERROR: File backup validation: FAILED (missing files: ${missing_files[*]})"
        return 1
    fi
}

# Generate validation report
generate_report() {
    local report_data=""
    local total_backups=0
    local valid_backups=0
    local validation_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Start JSON report
    echo "{" > "$VALIDATION_REPORT"
    echo "  \"timestamp\": \"$validation_timestamp\"," >> "$VALIDATION_REPORT"
    echo "  \"validation_results\": {" >> "$VALIDATION_REPORT"
    
    # Validate database backups
    echo "    \"database_backups\": [" >> "$VALIDATION_REPORT"
    local first_db=true
    for backup in "$BACKUP_DIR/database"/*.sql.gz; do
        if [ -f "$backup" ]; then
            [ "$first_db" = false ] && echo "," >> "$VALIDATION_REPORT"
            first_db=false
            
            total_backups=$((total_backups + 1))
            local filename=$(basename "$backup")
            local file_size=$(stat -f%z "$backup" 2>/dev/null || stat -c%s "$backup" 2>/dev/null || echo "0")
            local file_date=$(stat -f%Sm -t%Y-%m-%d "$backup" 2>/dev/null || stat -c%y "$backup" 2>/dev/null | cut -d' ' -f1)
            
            echo -n "      {" >> "$VALIDATION_REPORT"
            echo -n "\"filename\": \"$filename\", " >> "$VALIDATION_REPORT"
            echo -n "\"size\": $file_size, " >> "$VALIDATION_REPORT"
            echo -n "\"date\": \"$file_date\", " >> "$VALIDATION_REPORT"
            
            if validate_database_backup "$backup"; then
                echo "\"status\": \"valid\"}" >> "$VALIDATION_REPORT"
                valid_backups=$((valid_backups + 1))
            else
                echo "\"status\": \"invalid\"}" >> "$VALIDATION_REPORT"
            fi
        fi
    done
    echo "" >> "$VALIDATION_REPORT"
    echo "    ]," >> "$VALIDATION_REPORT"
    
    # Validate file backups
    echo "    \"file_backups\": [" >> "$VALIDATION_REPORT"
    local first_file=true
    for backup in "$BACKUP_DIR/files"/*.tar.gz; do
        if [ -f "$backup" ]; then
            [ "$first_file" = false ] && echo "," >> "$VALIDATION_REPORT"
            first_file=false
            
            total_backups=$((total_backups + 1))
            local filename=$(basename "$backup")
            local file_size=$(stat -f%z "$backup" 2>/dev/null || stat -c%s "$backup" 2>/dev/null || echo "0")
            local file_date=$(stat -f%Sm -t%Y-%m-%d "$backup" 2>/dev/null || stat -c%y "$backup" 2>/dev/null | cut -d' ' -f1)
            
            echo -n "      {" >> "$VALIDATION_REPORT"
            echo -n "\"filename\": \"$filename\", " >> "$VALIDATION_REPORT"
            echo -n "\"size\": $file_size, " >> "$VALIDATION_REPORT"
            echo -n "\"date\": \"$file_date\", " >> "$VALIDATION_REPORT"
            
            if validate_file_backup "$backup"; then
                echo "\"status\": \"valid\"}" >> "$VALIDATION_REPORT"
                valid_backups=$((valid_backups + 1))
            else
                echo "\"status\": \"invalid\"}" >> "$VALIDATION_REPORT"
            fi
        fi
    done
    echo "" >> "$VALIDATION_REPORT"
    echo "    ]" >> "$VALIDATION_REPORT"
    echo "  }," >> "$VALIDATION_REPORT"
    
    # Summary
    local success_rate=0
    if [ $total_backups -gt 0 ]; then
        success_rate=$(echo "scale=2; $valid_backups * 100 / $total_backups" | bc)
    fi
    
    echo "  \"summary\": {" >> "$VALIDATION_REPORT"
    echo "    \"total_backups\": $total_backups," >> "$VALIDATION_REPORT"
    echo "    \"valid_backups\": $valid_backups," >> "$VALIDATION_REPORT"
    echo "    \"invalid_backups\": $((total_backups - valid_backups))," >> "$VALIDATION_REPORT"
    echo "    \"success_rate\": \"$success_rate%\"" >> "$VALIDATION_REPORT"
    echo "  }" >> "$VALIDATION_REPORT"
    echo "}" >> "$VALIDATION_REPORT"
    
    log "Validation report generated: $VALIDATION_REPORT"
    log "Validation summary: $valid_backups/$total_backups backups are valid ($success_rate%)"
}

# Main function
main() {
    log "Starting backup validation process..."
    
    # Create backup directories if they don't exist
    mkdir -p "$BACKUP_DIR"/{database,files}
    
    # Generate validation report
    generate_report
    
    log "Backup validation completed"
}

# Execute main function
main "$@"