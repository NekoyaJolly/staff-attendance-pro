#!/bin/bash

# Backup Retention Policy Installation and Setup Script
# Sets up the complete backup retention system in production

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_USER="backup"
INSTALL_LOG="/var/log/backup-retention-install.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INSTALL] $1" | tee -a "$INSTALL_LOG"
}

# Create backup user and directories
setup_backup_user() {
    log "Setting up backup user and directories..."
    
    # Create backup user if doesn't exist
    if ! id "$BACKUP_USER" >/dev/null 2>&1; then
        useradd -r -s /bin/bash -d /var/lib/backup -m "$BACKUP_USER"
        log "Created backup user: $BACKUP_USER"
    fi
    
    # Create necessary directories
    mkdir -p /var/backups/timetracking/{database,files,logs}
    mkdir -p /var/archives/timetracking/{hourly,daily,weekly,monthly,yearly}
    mkdir -p /var/reports/backup-compliance
    mkdir -p /var/log
    mkdir -p /var/lib
    mkdir -p /etc
    
    # Set ownership and permissions
    chown -R "$BACKUP_USER:$BACKUP_USER" /var/backups/timetracking
    chown -R "$BACKUP_USER:$BACKUP_USER" /var/archives/timetracking
    chown -R "$BACKUP_USER:$BACKUP_USER" /var/reports/backup-compliance
    
    chmod 750 /var/backups/timetracking
    chmod 750 /var/archives/timetracking
    chmod 755 /var/reports/backup-compliance
    
    log "Backup directories created and configured"
}

# Install backup scripts
install_backup_scripts() {
    log "Installing backup retention scripts..."
    
    local target_dir="/usr/local/bin"
    
    # Copy scripts to system directory
    cp "$SCRIPT_DIR/backup-retention-policy.sh" "$target_dir/"
    cp "$SCRIPT_DIR/backup-system-enhanced.sh" "$target_dir/"
    cp "$SCRIPT_DIR/emergency-cleanup.sh" "$target_dir/"
    cp "$SCRIPT_DIR/backup-audit.sh" "$target_dir/"
    cp "$SCRIPT_DIR/post-backup-optimization.sh" "$target_dir/"
    
    # Set execute permissions
    chmod +x "$target_dir"/backup-*.sh
    chmod +x "$target_dir"/emergency-cleanup.sh
    chmod +x "$target_dir"/post-backup-optimization.sh
    
    # Set ownership
    chown root:root "$target_dir"/backup-*.sh
    chown root:root "$target_dir"/emergency-cleanup.sh
    chown root:root "$target_dir"/post-backup-optimization.sh
    
    log "Backup scripts installed to $target_dir"
}

# Setup cron jobs
setup_cron_jobs() {
    log "Setting up cron jobs for backup retention..."
    
    # Install cron jobs for backup user
    crontab -u "$BACKUP_USER" "$SCRIPT_DIR/backup-crontab-retention"
    
    log "Cron jobs installed for user: $BACKUP_USER"
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation for backup logs..."
    
    # Copy logrotate configuration
    cp "$SCRIPT_DIR/logrotate-backup-logs" /etc/logrotate.d/backup-logs
    chmod 644 /etc/logrotate.d/backup-logs
    
    log "Log rotation configured"
}

# Initialize configuration
initialize_configuration() {
    log "Initializing backup retention configuration..."
    
    # Run retention policy script to create initial configuration
    /usr/local/bin/backup-retention-policy.sh init
    
    log "Backup retention configuration initialized"
}

# Setup monitoring and alerting
setup_monitoring() {
    log "Setting up backup monitoring..."
    
    # Create systemd service for backup monitoring (optional)
    cat > /etc/systemd/system/backup-retention.service << EOF
[Unit]
Description=Backup Retention Policy Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=$BACKUP_USER
ExecStart=/usr/local/bin/backup-retention-policy.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Create timer for daily execution
    cat > /etc/systemd/system/backup-retention.timer << EOF
[Unit]
Description=Daily Backup Retention Policy
Requires=backup-retention.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Enable and start the timer
    systemctl daemon-reload
    systemctl enable backup-retention.timer
    systemctl start backup-retention.timer
    
    log "Backup retention systemd service configured"
}

# Verify installation
verify_installation() {
    log "Verifying backup retention installation..."
    
    local verification_errors=0
    
    # Check if user exists
    if ! id "$BACKUP_USER" >/dev/null 2>&1; then
        log "ERROR: Backup user not created"
        ((verification_errors++))
    fi
    
    # Check directories
    local required_dirs=(
        "/var/backups/timetracking"
        "/var/archives/timetracking"
        "/var/reports/backup-compliance"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            log "ERROR: Directory missing: $dir"
            ((verification_errors++))
        fi
    done
    
    # Check scripts
    local required_scripts=(
        "/usr/local/bin/backup-retention-policy.sh"
        "/usr/local/bin/backup-system-enhanced.sh"
        "/usr/local/bin/emergency-cleanup.sh"
        "/usr/local/bin/backup-audit.sh"
    )
    
    for script in "${required_scripts[@]}"; do
        if [ ! -f "$script" ] || [ ! -x "$script" ]; then
            log "ERROR: Script missing or not executable: $script"
            ((verification_errors++))
        fi
    done
    
    # Check cron jobs
    if ! crontab -u "$BACKUP_USER" -l >/dev/null 2>&1; then
        log "ERROR: Cron jobs not installed for $BACKUP_USER"
        ((verification_errors++))
    fi
    
    if [ $verification_errors -eq 0 ]; then
        log "Installation verification: PASSED"
        return 0
    else
        log "Installation verification: FAILED ($verification_errors errors)"
        return 1
    fi
}

# Generate installation report
generate_installation_report() {
    log "Generating installation report..."
    
    local report_file="/var/reports/backup-retention-installation-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
BACKUP RETENTION SYSTEM INSTALLATION REPORT
==========================================

Installation Date: $(date)
Installation User: $(whoami)
Target System: $(hostname)

COMPONENTS INSTALLED:
- Backup user: $BACKUP_USER
- Backup scripts: /usr/local/bin/backup-*.sh
- Configuration: /etc/backup-retention.conf
- Cron jobs: Installed for $BACKUP_USER
- Log rotation: /etc/logrotate.d/backup-logs
- Systemd service: backup-retention.service

DIRECTORY STRUCTURE:
- Backups: /var/backups/timetracking/
- Archives: /var/archives/timetracking/
- Reports: /var/reports/backup-compliance/
- Logs: /var/log/backup-*.log

RETENTION POLICIES:
- Hourly: 24 hours
- Daily: 30 days
- Weekly: 12 weeks
- Monthly: 12 months
- Yearly: 7 years
- Critical: 10 years

NEXT STEPS:
1. Review and customize /etc/backup-retention.conf
2. Test backup system: /usr/local/bin/backup-system-enhanced.sh
3. Run initial audit: /usr/local/bin/backup-audit.sh
4. Configure email notifications
5. Monitor backup logs: /var/log/backup-*.log

SUPPORT:
- Installation log: $INSTALL_LOG
- System status: systemctl status backup-retention.timer
- Manual execution: /usr/local/bin/backup-retention-policy.sh
EOF

    log "Installation report generated: $report_file"
}

# Main installation process
main() {
    log "Starting backup retention system installation..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        echo "ERROR: This script must be run as root"
        exit 1
    fi
    
    # Execute installation steps
    setup_backup_user
    install_backup_scripts
    setup_cron_jobs
    setup_log_rotation
    initialize_configuration
    setup_monitoring
    
    # Verify installation
    if verify_installation; then
        generate_installation_report
        log "Backup retention system installation completed successfully"
        
        echo ""
        echo "============================================"
        echo "BACKUP RETENTION SYSTEM INSTALLATION COMPLETE"
        echo "============================================"
        echo ""
        echo "Installation log: $INSTALL_LOG"
        echo "Configuration file: /etc/backup-retention.conf"
        echo "Service status: systemctl status backup-retention.timer"
        echo ""
        echo "To test the system:"
        echo "  sudo -u $BACKUP_USER /usr/local/bin/backup-system-enhanced.sh"
        echo ""
        echo "To run audit:"
        echo "  sudo -u $BACKUP_USER /usr/local/bin/backup-audit.sh"
        echo ""
    else
        log "Installation failed - check errors above"
        exit 1
    fi
}

# Execute main function
main "$@"