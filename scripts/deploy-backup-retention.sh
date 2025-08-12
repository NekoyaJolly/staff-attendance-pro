#!/bin/bash

# Deploy Backup Retention System to Production
# This script sets up the complete backup infrastructure with retention policies

set -euo pipefail

echo "==================================================="
echo "DEPLOYING BACKUP RETENTION SYSTEM TO PRODUCTION"
echo "==================================================="

# Configuration
DEPLOY_LOG="/var/log/backup-deployment.log"
PRODUCTION_ENV=${1:-"production"}

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DEPLOY] $1" | tee -a "$DEPLOY_LOG"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log "ERROR: Docker is not running"
        exit 1
    fi
    
    # Check available disk space (need at least 10GB for backups)
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=$((10 * 1024 * 1024))  # 10GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        log "ERROR: Insufficient disk space. Available: ${available_space}KB, Required: ${required_space}KB"
        exit 1
    fi
    
    # Check if backup directories can be created
    sudo mkdir -p /var/backups/timetracking /var/archives/timetracking /var/reports/backup-compliance
    
    log "Pre-deployment checks passed"
}

# Deploy backup system with retention policies
deploy_backup_system() {
    log "Deploying backup system with retention policies..."
    
    # Start the backup service
    docker-compose --profile backup up -d backup
    
    # Wait for backup container to be ready
    log "Waiting for backup container to initialize..."
    sleep 30
    
    # Verify backup container is running
    if ! docker-compose ps backup | grep -q "Up"; then
        log "ERROR: Backup container failed to start"
        docker-compose logs backup
        exit 1
    fi
    
    log "Backup container started successfully"
}

# Test backup retention system
test_backup_system() {
    log "Testing backup retention system..."
    
    # Create a test backup
    docker-compose exec backup /scripts/backup-system-enhanced.sh || {
        log "ERROR: Test backup failed"
        return 1
    }
    
    # Run backup audit
    docker-compose exec backup /usr/local/bin/backup-audit.sh inventory || {
        log "ERROR: Backup audit failed"
        return 1
    }
    
    # Test retention policy
    docker-compose exec backup /usr/local/bin/backup-retention-policy.sh || {
        log "ERROR: Retention policy test failed"
        return 1
    }
    
    log "Backup system tests passed"
}

# Setup monitoring and alerting
setup_monitoring() {
    log "Setting up backup monitoring and alerting..."
    
    # Create monitoring script for backup health
    cat > ./scripts/backup-monitoring.sh << 'EOF'
#!/bin/bash
# Backup Health Monitoring Script

BACKUP_CONTAINER="timetracking_backup_1"
HEALTH_FILE="/var/lib/backup-health.status"

# Check if backup container is running
if ! docker ps | grep -q "$BACKUP_CONTAINER"; then
    echo "CRITICAL: Backup container is not running"
    exit 2
fi

# Check last backup status
if [ -f "$HEALTH_FILE" ]; then
    LAST_STATUS=$(docker exec "$BACKUP_CONTAINER" cat /var/lib/backup-health.status | jq -r '.status' 2>/dev/null || echo "UNKNOWN")
    if [ "$LAST_STATUS" = "FAILED" ]; then
        echo "CRITICAL: Last backup failed"
        exit 2
    fi
fi

# Check disk space in backup container
DISK_USAGE=$(docker exec "$BACKUP_CONTAINER" df /var/backups/timetracking | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "WARNING: Backup disk usage at ${DISK_USAGE}%"
    exit 1
fi

echo "OK: Backup system healthy"
exit 0
EOF
    
    chmod +x ./scripts/backup-monitoring.sh
    
    log "Backup monitoring configured"
}

# Generate deployment report
generate_deployment_report() {
    log "Generating deployment report..."
    
    local report_file="/tmp/backup-deployment-report-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
BACKUP RETENTION SYSTEM DEPLOYMENT REPORT
========================================

Deployment Date: $(date)
Environment: $PRODUCTION_ENV
Deployment User: $(whoami)
Target System: $(hostname)

DEPLOYED COMPONENTS:
✓ Enhanced backup system with retention policies
✓ Automated backup scheduling (hourly/daily/weekly/monthly/yearly)
✓ Intelligent retention policy management
✓ Emergency cleanup procedures
✓ Backup integrity verification
✓ Compliance auditing system
✓ Monitoring and alerting

RETENTION POLICIES CONFIGURED:
- Hourly backups: 24 hours retention
- Daily backups: 30 days retention  
- Weekly backups: 12 weeks retention
- Monthly backups: 12 months retention
- Yearly backups: 7 years retention
- Critical data: 10 years retention (compliance)

BACKUP SCHEDULE:
- Hourly: Every hour (automatic detection)
- Daily: 2:00 AM (with retention cleanup at 1:00 AM)
- Weekly: Sunday 3:00 AM
- Monthly: 1st of month 4:00 AM
- Yearly: January 1st 5:00 AM

MONITORING:
- Health checks: Every 6 hours
- Audit reports: Monthly
- Emergency cleanup: When disk usage > 90%
- Performance optimization: Daily at 3:30 AM

STORAGE LOCATIONS:
- Active backups: /var/backups/timetracking/
- Archived backups: /var/archives/timetracking/
- Compliance reports: /var/reports/backup-compliance/
- System logs: /var/log/backup-*.log

CONTAINER STATUS:
$(docker-compose ps backup)

NEXT STEPS:
1. Monitor backup logs: docker-compose logs -f backup
2. View backup status: docker-compose exec backup cat /var/lib/backup-health.status
3. Run manual backup: docker-compose exec backup /scripts/backup-system-enhanced.sh
4. Generate audit report: docker-compose exec backup /usr/local/bin/backup-audit.sh
5. Configure email notifications in container environment

MAINTENANCE COMMANDS:
- Start backup service: docker-compose --profile backup up -d backup
- View backup logs: docker-compose logs backup
- Execute manual backup: docker-compose exec backup /scripts/backup-system-enhanced.sh
- Run retention cleanup: docker-compose exec backup /usr/local/bin/backup-retention-policy.sh
- Emergency cleanup: docker-compose exec backup /usr/local/bin/emergency-cleanup.sh
- System audit: docker-compose exec backup /usr/local/bin/backup-audit.sh

SUPPORT:
- Deployment log: $DEPLOY_LOG
- Backup monitoring: ./scripts/backup-monitoring.sh
- Container health: docker-compose exec backup ps aux
EOF

    echo "$report_file"
    log "Deployment report generated: $report_file"
    
    # Display summary
    echo ""
    echo "============================================"
    echo "BACKUP RETENTION SYSTEM DEPLOYMENT COMPLETE"
    echo "============================================"
    echo ""
    echo "Deployment report: $report_file"
    echo "Backup container status: $(docker-compose ps backup --format "table {{.State}}")"
    echo ""
    echo "To monitor backups:"
    echo "  docker-compose logs -f backup"
    echo ""
    echo "To run manual backup:"
    echo "  docker-compose exec backup /scripts/backup-system-enhanced.sh"
    echo ""
    echo "To view backup health:"
    echo "  docker-compose exec backup cat /var/lib/backup-health.status"
    echo ""
}

# Main deployment process
main() {
    log "Starting backup retention system deployment..."
    
    # Execute deployment steps
    pre_deployment_checks
    deploy_backup_system
    
    # Test the system
    if test_backup_system; then
        setup_monitoring
        local report_file=$(generate_deployment_report)
        
        log "Backup retention system deployment completed successfully"
        
        # Copy report to accessible location
        cp "$report_file" "./BACKUP_DEPLOYMENT_REPORT.txt"
        
        echo ""
        echo "Deployment successful! Check BACKUP_DEPLOYMENT_REPORT.txt for details."
        
    else
        log "Deployment validation failed"
        echo ""
        echo "Deployment failed! Check logs:"
        echo "  docker-compose logs backup"
        echo "  cat $DEPLOY_LOG"
        exit 1
    fi
}

# Execute main function
main "$@"