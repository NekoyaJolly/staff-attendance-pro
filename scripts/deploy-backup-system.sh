#!/bin/bash

# Production deployment script for backup system
# Sets up and configures the automated backup infrastructure

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_BASE_DIR="/var/backups/timetracking"
LOG_DIR="/var/log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    local missing_deps=()
    
    # Check for required commands
    for cmd in docker docker-compose crontab systemctl; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log "Please install missing dependencies and try again"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running or not accessible"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create backup directories
setup_directories() {
    log "Setting up backup directories..."
    
    # Create backup directories
    sudo mkdir -p "$BACKUP_BASE_DIR"/{database,files,logs}
    sudo mkdir -p "$LOG_DIR"
    
    # Set proper permissions
    sudo chown -R "$(whoami):$(whoami)" "$BACKUP_BASE_DIR"
    sudo chmod -R 755 "$BACKUP_BASE_DIR"
    
    log_success "Backup directories created and configured"
}

# Make scripts executable
setup_scripts() {
    log "Setting up backup scripts..."
    
    # Make all scripts executable
    chmod +x "$SCRIPT_DIR"/*.sh
    
    # Create symlinks in /usr/local/bin for easy access
    sudo ln -sf "$SCRIPT_DIR/backup-system.sh" /usr/local/bin/backup-system
    sudo ln -sf "$SCRIPT_DIR/backup-restore.sh" /usr/local/bin/backup-restore
    sudo ln -sf "$SCRIPT_DIR/backup-validation.sh" /usr/local/bin/backup-validation
    sudo ln -sf "$SCRIPT_DIR/backup-health-check.sh" /usr/local/bin/backup-health-check
    sudo ln -sf "$SCRIPT_DIR/backup-metrics.sh" /usr/local/bin/backup-metrics
    
    log_success "Backup scripts configured"
}

# Setup cron jobs
setup_cron() {
    log "Setting up cron jobs..."
    
    # Backup current crontab
    crontab -l > /tmp/current_crontab 2>/dev/null || echo "" > /tmp/current_crontab
    
    # Remove existing backup-related cron jobs
    grep -v "backup-system\|backup-validation\|backup-health-check" /tmp/current_crontab > /tmp/new_crontab || true
    
    # Add new backup cron jobs
    cat "$SCRIPT_DIR/backup-crontab" >> /tmp/new_crontab
    
    # Install new crontab
    crontab /tmp/new_crontab
    
    # Clean up temporary files
    rm -f /tmp/current_crontab /tmp/new_crontab
    
    log_success "Cron jobs configured"
}

# Setup monitoring infrastructure
setup_monitoring() {
    log "Setting up monitoring infrastructure..."
    
    # Pull monitoring images
    docker-compose -f "$PROJECT_ROOT/docker-compose.backup.yml" pull
    
    # Start monitoring services
    docker-compose -f "$PROJECT_ROOT/docker-compose.backup.yml" up -d prometheus grafana backup_monitor
    
    # Wait for services to start
    sleep 10
    
    # Check if services are running
    if docker-compose -f "$PROJECT_ROOT/docker-compose.backup.yml" ps | grep -q "Up"; then
        log_success "Monitoring services started"
    else
        log_warning "Some monitoring services may not have started correctly"
    fi
}

# Configure log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    cat << EOF | sudo tee /etc/logrotate.d/backup-system > /dev/null
/var/log/backup-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}

/var/log/cron-*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
}
EOF
    
    log_success "Log rotation configured"
}

# Setup systemd service for backup monitoring
setup_systemd_service() {
    log "Setting up systemd service for backup monitoring..."
    
    cat << EOF | sudo tee /etc/systemd/system/backup-monitor.service > /dev/null
[Unit]
Description=Time Tracking Backup Monitor
After=docker.service
Requires=docker.service

[Service]
Type=simple
ExecStart=$SCRIPT_DIR/backup-metrics.sh serve 9090
Restart=always
RestartSec=10
User=$(whoami)
Group=$(whoami)

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable backup-monitor.service
    sudo systemctl start backup-monitor.service
    
    log_success "Backup monitor service configured and started"
}

# Validate deployment
validate_deployment() {
    log "Validating deployment..."
    
    local validation_errors=0
    
    # Check if backup directories exist
    if [ ! -d "$BACKUP_BASE_DIR" ]; then
        log_error "Backup directory not found: $BACKUP_BASE_DIR"
        validation_errors=$((validation_errors + 1))
    fi
    
    # Check if scripts are executable
    for script in backup-system.sh backup-restore.sh backup-validation.sh backup-health-check.sh; do
        if [ ! -x "$SCRIPT_DIR/$script" ]; then
            log_error "Script not executable: $script"
            validation_errors=$((validation_errors + 1))
        fi
    done
    
    # Check cron jobs
    if ! crontab -l | grep -q "backup-system"; then
        log_error "Backup cron jobs not found"
        validation_errors=$((validation_errors + 1))
    fi
    
    # Check systemd service
    if ! systemctl is-active --quiet backup-monitor.service; then
        log_error "Backup monitor service is not running"
        validation_errors=$((validation_errors + 1))
    fi
    
    # Run a test backup validation
    log "Running test backup validation..."
    if "$SCRIPT_DIR/backup-health-check.sh" > /dev/null 2>&1; then
        log_success "Health check passed"
    else
        log_warning "Health check reported issues (this is normal for initial setup)"
    fi
    
    if [ $validation_errors -eq 0 ]; then
        log_success "Deployment validation passed"
        return 0
    else
        log_error "Deployment validation failed with $validation_errors errors"
        return 1
    fi
}

# Display deployment summary
show_summary() {
    log "Deployment Summary:"
    echo ""
    echo "📁 Backup Directory: $BACKUP_BASE_DIR"
    echo "📝 Log Directory: $LOG_DIR"
    echo "⏰ Cron Schedule:"
    echo "   - Daily backup: 2:00 AM"
    echo "   - Weekly backup: Sunday 3:00 AM"
    echo "   - Monthly backup: 1st of month 4:00 AM"
    echo "   - Health check: Every 6 hours"
    echo "   - Validation: Daily 6:00 AM"
    echo ""
    echo "🔧 Available Commands:"
    echo "   backup-system         - Run manual backup"
    echo "   backup-restore        - Restore from backup"
    echo "   backup-validation     - Validate backups"
    echo "   backup-health-check   - Check system health"
    echo "   backup-metrics        - Generate metrics"
    echo ""
    echo "📊 Monitoring:"
    echo "   Grafana Dashboard: http://localhost:3001"
    echo "   Prometheus: http://localhost:9090"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Configure notification settings in environment variables"
    echo "   2. Test backup and restore procedures"
    echo "   3. Review and adjust retention policies"
    echo "   4. Set up external monitoring alerts"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -f /tmp/current_crontab /tmp/new_crontab
}

# Main deployment function
main() {
    log "Starting backup system deployment..."
    
    # Set cleanup trap
    trap cleanup EXIT
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        log_error "Please do not run this script as root"
        exit 1
    fi
    
    # Perform deployment steps
    check_prerequisites
    setup_directories
    setup_scripts
    setup_cron
    setup_log_rotation
    setup_systemd_service
    setup_monitoring
    
    # Validate deployment
    if validate_deployment; then
        log_success "Backup system deployment completed successfully!"
        echo ""
        show_summary
    else
        log_error "Deployment completed with errors. Please review the logs."
        exit 1
    fi
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi