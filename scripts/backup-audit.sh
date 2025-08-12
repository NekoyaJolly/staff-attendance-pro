#!/bin/bash

# Backup Audit Script
# Performs comprehensive auditing of backup system and retention policies

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/timetracking"
AUDIT_LOG="/var/log/backup-audit.log"
COMPLIANCE_REPORT_DIR="/var/reports/backup-compliance"
CURRENT_DATE=$(date +%Y%m%d)

# Compliance requirements
REQUIRED_DAILY_BACKUPS=30
REQUIRED_WEEKLY_BACKUPS=12
REQUIRED_MONTHLY_BACKUPS=12
REQUIRED_YEARLY_BACKUPS=7

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [AUDIT] $1" | tee -a "$AUDIT_LOG"
}

# Initialize audit
initialize_audit() {
    mkdir -p "$COMPLIANCE_REPORT_DIR"
    mkdir -p "$(dirname "$AUDIT_LOG")"
    
    log "Starting backup system audit..."
    log "Audit date: $(date)"
    log "Backup directory: $BACKUP_DIR"
}

# Audit backup inventory
audit_backup_inventory() {
    log "Auditing backup inventory..."
    
    local audit_report="$COMPLIANCE_REPORT_DIR/inventory_audit_$CURRENT_DATE.json"
    
    # Count backups by type
    local hourly_count=$(find "$BACKUP_DIR/database" -name "hourly_*.sql.gz" 2>/dev/null | wc -l)
    local daily_count=$(find "$BACKUP_DIR/database" -name "daily_*.sql.gz" 2>/dev/null | wc -l)
    local weekly_count=$(find "$BACKUP_DIR/database" -name "weekly_*.sql.gz" 2>/dev/null | wc -l)
    local monthly_count=$(find "$BACKUP_DIR/database" -name "monthly_*.sql.gz" 2>/dev/null | wc -l)
    local yearly_count=$(find "$BACKUP_DIR/database" -name "yearly_*.sql.gz" 2>/dev/null | wc -l)
    
    # Check compliance
    local compliance_status="COMPLIANT"
    local issues=()
    
    if [ "$daily_count" -lt "$REQUIRED_DAILY_BACKUPS" ]; then
        compliance_status="NON_COMPLIANT"
        issues+=("Insufficient daily backups: $daily_count (required: $REQUIRED_DAILY_BACKUPS)")
    fi
    
    if [ "$weekly_count" -lt "$REQUIRED_WEEKLY_BACKUPS" ]; then
        compliance_status="NON_COMPLIANT"
        issues+=("Insufficient weekly backups: $weekly_count (required: $REQUIRED_WEEKLY_BACKUPS)")
    fi
    
    if [ "$monthly_count" -lt "$REQUIRED_MONTHLY_BACKUPS" ]; then
        compliance_status="NON_COMPLIANT"
        issues+=("Insufficient monthly backups: $monthly_count (required: $REQUIRED_MONTHLY_BACKUPS)")
    fi
    
    if [ "$yearly_count" -lt "$REQUIRED_YEARLY_BACKUPS" ]; then
        compliance_status="NON_COMPLIANT"
        issues+=("Insufficient yearly backups: $yearly_count (required: $REQUIRED_YEARLY_BACKUPS)")
    fi
    
    # Generate inventory report
    cat > "$audit_report" << EOF
{
    "audit_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "audit_type": "inventory",
    "compliance_status": "$compliance_status",
    "backup_counts": {
        "hourly": $hourly_count,
        "daily": $daily_count,
        "weekly": $weekly_count,
        "monthly": $monthly_count,
        "yearly": $yearly_count
    },
    "compliance_requirements": {
        "daily_required": $REQUIRED_DAILY_BACKUPS,
        "weekly_required": $REQUIRED_WEEKLY_BACKUPS,
        "monthly_required": $REQUIRED_MONTHLY_BACKUPS,
        "yearly_required": $REQUIRED_YEARLY_BACKUPS
    },
    "issues": [
EOF

    # Add issues to report
    for issue in "${issues[@]}"; do
        echo "        \"$issue\"," >> "$audit_report"
    done
    
    # Remove trailing comma and close JSON
    sed -i '$ s/,$//' "$audit_report"
    echo "    ]" >> "$audit_report"
    echo "}" >> "$audit_report"
    
    log "Inventory audit completed: $compliance_status"
    log "Report generated: $audit_report"
}

# Audit backup integrity
audit_backup_integrity() {
    log "Auditing backup integrity..."
    
    local integrity_report="$COMPLIANCE_REPORT_DIR/integrity_audit_$CURRENT_DATE.json"
    local total_backups=0
    local corrupted_backups=0
    local corrupted_files=()
    
    # Check all compressed backup files
    for backup_file in "$BACKUP_DIR"/database/*.sql.gz; do
        if [ -f "$backup_file" ]; then
            ((total_backups++))
            
            # Test gzip integrity
            if ! gzip -t "$backup_file" 2>/dev/null; then
                ((corrupted_backups++))
                corrupted_files+=("$(basename "$backup_file")")
                log "INTEGRITY FAILURE: $backup_file"
            fi
        fi
    done
    
    # Check file backups
    for backup_file in "$BACKUP_DIR"/files/*.tar.gz; do
        if [ -f "$backup_file" ]; then
            ((total_backups++))
            
            # Test tar integrity
            if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
                ((corrupted_backups++))
                corrupted_files+=("$(basename "$backup_file")")
                log "INTEGRITY FAILURE: $backup_file"
            fi
        fi
    done
    
    local integrity_status="HEALTHY"
    if [ "$corrupted_backups" -gt 0 ]; then
        integrity_status="COMPROMISED"
    fi
    
    # Generate integrity report
    cat > "$integrity_report" << EOF
{
    "audit_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "audit_type": "integrity",
    "status": "$integrity_status",
    "total_backups_checked": $total_backups,
    "corrupted_backups": $corrupted_backups,
    "corruption_rate": "$(echo "scale=2; $corrupted_backups * 100 / $total_backups" | bc)%",
    "corrupted_files": [
EOF

    # Add corrupted files to report
    for file in "${corrupted_files[@]}"; do
        echo "        \"$file\"," >> "$integrity_report"
    done
    
    # Remove trailing comma and close JSON
    sed -i '$ s/,$//' "$integrity_report"
    echo "    ]" >> "$integrity_report"
    echo "}" >> "$integrity_report"
    
    log "Integrity audit completed: $integrity_status ($corrupted_backups/$total_backups corrupted)"
    log "Report generated: $integrity_report"
}

# Audit retention policy compliance
audit_retention_compliance() {
    log "Auditing retention policy compliance..."
    
    local retention_report="$COMPLIANCE_REPORT_DIR/retention_audit_$CURRENT_DATE.json"
    local compliance_issues=()
    
    # Check for backups that should have been deleted
    local cutoff_daily=$(date -d "30 days ago" "+%Y%m%d")
    local cutoff_weekly=$(date -d "12 weeks ago" "+%Y%m%d")
    local cutoff_monthly=$(date -d "12 months ago" "+%Y%m%d")
    local cutoff_yearly=$(date -d "7 years ago" "+%Y%m%d")
    
    # Check daily backups
    for backup_file in "$BACKUP_DIR/database/daily_"*.sql.gz; do
        if [ -f "$backup_file" ]; then
            local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}')
            if [[ "$file_date" < "$cutoff_daily" ]]; then
                compliance_issues+=("Daily backup beyond retention: $(basename "$backup_file")")
            fi
        fi
    done
    
    # Check weekly backups
    for backup_file in "$BACKUP_DIR/database/weekly_"*.sql.gz; do
        if [ -f "$backup_file" ]; then
            local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}')
            if [[ "$file_date" < "$cutoff_weekly" ]]; then
                compliance_issues+=("Weekly backup beyond retention: $(basename "$backup_file")")
            fi
        fi
    done
    
    # Check monthly backups
    for backup_file in "$BACKUP_DIR/database/monthly_"*.sql.gz; do
        if [ -f "$backup_file" ]; then
            local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}')
            if [[ "$file_date" < "$cutoff_monthly" ]]; then
                compliance_issues+=("Monthly backup beyond retention: $(basename "$backup_file")")
            fi
        fi
    done
    
    # Check yearly backups
    for backup_file in "$BACKUP_DIR/database/yearly_"*.sql.gz; do
        if [ -f "$backup_file" ]; then
            local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}')
            if [[ "$file_date" < "$cutoff_yearly" ]]; then
                compliance_issues+=("Yearly backup beyond retention: $(basename "$backup_file")")
            fi
        fi
    done
    
    local retention_status="COMPLIANT"
    if [ ${#compliance_issues[@]} -gt 0 ]; then
        retention_status="NON_COMPLIANT"
    fi
    
    # Generate retention compliance report
    cat > "$retention_report" << EOF
{
    "audit_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "audit_type": "retention_compliance",
    "status": "$retention_status",
    "cutoff_dates": {
        "daily": "$cutoff_daily",
        "weekly": "$cutoff_weekly",
        "monthly": "$cutoff_monthly",
        "yearly": "$cutoff_yearly"
    },
    "violations_count": ${#compliance_issues[@]},
    "violations": [
EOF

    # Add violations to report
    for issue in "${compliance_issues[@]}"; do
        echo "        \"$issue\"," >> "$retention_report"
    done
    
    # Remove trailing comma and close JSON
    sed -i '$ s/,$//' "$retention_report"
    echo "    ]" >> "$retention_report"
    echo "}" >> "$retention_report"
    
    log "Retention compliance audit completed: $retention_status (${#compliance_issues[@]} violations)"
    log "Report generated: $retention_report"
}

# Generate comprehensive audit summary
generate_audit_summary() {
    log "Generating comprehensive audit summary..."
    
    local summary_report="$COMPLIANCE_REPORT_DIR/audit_summary_$CURRENT_DATE.json"
    
    # Read individual audit results
    local inventory_status="UNKNOWN"
    local integrity_status="UNKNOWN"
    local retention_status="UNKNOWN"
    
    if [ -f "$COMPLIANCE_REPORT_DIR/inventory_audit_$CURRENT_DATE.json" ]; then
        inventory_status=$(jq -r '.compliance_status' "$COMPLIANCE_REPORT_DIR/inventory_audit_$CURRENT_DATE.json" 2>/dev/null || echo "UNKNOWN")
    fi
    
    if [ -f "$COMPLIANCE_REPORT_DIR/integrity_audit_$CURRENT_DATE.json" ]; then
        integrity_status=$(jq -r '.status' "$COMPLIANCE_REPORT_DIR/integrity_audit_$CURRENT_DATE.json" 2>/dev/null || echo "UNKNOWN")
    fi
    
    if [ -f "$COMPLIANCE_REPORT_DIR/retention_audit_$CURRENT_DATE.json" ]; then
        retention_status=$(jq -r '.status' "$COMPLIANCE_REPORT_DIR/retention_audit_$CURRENT_DATE.json" 2>/dev/null || echo "UNKNOWN")
    fi
    
    # Determine overall status
    local overall_status="COMPLIANT"
    if [[ "$inventory_status" == "NON_COMPLIANT" ]] || [[ "$integrity_status" == "COMPROMISED" ]] || [[ "$retention_status" == "NON_COMPLIANT" ]]; then
        overall_status="NON_COMPLIANT"
    fi
    
    # Generate summary
    cat > "$summary_report" << EOF
{
    "audit_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "audit_type": "comprehensive_summary",
    "overall_status": "$overall_status",
    "individual_audits": {
        "inventory": {
            "status": "$inventory_status",
            "report_file": "inventory_audit_$CURRENT_DATE.json"
        },
        "integrity": {
            "status": "$integrity_status",
            "report_file": "integrity_audit_$CURRENT_DATE.json"
        },
        "retention_compliance": {
            "status": "$retention_status",
            "report_file": "retention_audit_$CURRENT_DATE.json"
        }
    },
    "recommendations": [
        "$([ "$inventory_status" == "NON_COMPLIANT" ] && echo "Review backup scheduling and fix inventory issues")",
        "$([ "$integrity_status" == "COMPROMISED" ] && echo "Investigate and repair corrupted backup files")",
        "$([ "$retention_status" == "NON_COMPLIANT" ] && echo "Apply retention policies to remove expired backups")"
    ],
    "next_audit_due": "$(date -d '+1 month' +%Y-%m-%d)",
    "audit_frequency": "monthly"
}
EOF
    
    log "Audit summary completed: $overall_status"
    log "Summary report generated: $summary_report"
    
    # Send audit summary if non-compliant
    if [ "$overall_status" == "NON_COMPLIANT" ]; then
        send_audit_alert "$summary_report"
    fi
}

# Send audit alert for non-compliance
send_audit_alert() {
    local summary_file=$1
    
    if [ -n "${AUDIT_ALERT_EMAIL:-}" ]; then
        local subject="Backup Audit Alert - Non-Compliance Detected"
        cat "$summary_file" | mail -s "$subject" "$AUDIT_ALERT_EMAIL" 2>/dev/null || true
    fi
    
    log "Audit alert sent for non-compliance"
}

# Main audit execution
main() {
    local audit_type=${1:-"full"}
    
    initialize_audit
    
    case "$audit_type" in
        "inventory")
            audit_backup_inventory
            ;;
        "integrity")
            audit_backup_integrity
            ;;
        "retention")
            audit_retention_compliance
            ;;
        "annual"|"full")
            audit_backup_inventory
            audit_backup_integrity
            audit_retention_compliance
            generate_audit_summary
            ;;
        *)
            log "ERROR: Unknown audit type: $audit_type"
            exit 1
            ;;
    esac
    
    log "Backup audit completed successfully"
}

# Execute main function
main "$@"