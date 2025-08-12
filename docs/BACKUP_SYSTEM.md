# Automated Backup System Documentation

## Overview

This automated backup system provides comprehensive data protection for the Time Tracking System with the following features:

- **Automated Scheduling**: Daily, weekly, and monthly backups
- **Data Validation**: Automated backup integrity checks
- **Health Monitoring**: Continuous system health monitoring
- **Alerting**: Real-time alerts for backup failures
- **Restoration**: Easy backup restoration procedures
- **Monitoring Dashboard**: Grafana dashboard for backup metrics

## Components

### Core Scripts

1. **backup-system.sh** - Main backup execution script
2. **backup-restore.sh** - Backup restoration utility
3. **backup-validation.sh** - Backup integrity validation
4. **backup-health-check.sh** - System health monitoring
5. **backup-metrics.sh** - Prometheus metrics generator
6. **deploy-backup-system.sh** - Deployment automation

### Infrastructure

- **PostgreSQL Database Backups**: Daily pg_dump with compression
- **Application File Backups**: Complete application state backup
- **Docker Compose Services**: Monitoring and backup orchestration
- **Cron Scheduling**: Automated execution scheduling
- **Log Aggregation**: Centralized logging with Fluentd
- **Metrics Collection**: Prometheus monitoring
- **Visualization**: Grafana dashboards

## Installation

### Prerequisites

- Docker and Docker Compose
- Linux system with cron support
- Sufficient disk space for backups
- Network access for monitoring services

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd timetracking-app

# Run deployment script
sudo ./scripts/deploy-backup-system.sh

# Verify installation
backup-health-check
```

### Manual Setup

1. **Install Dependencies**
   ```bash
   # Install required packages
   sudo apt-get update
   sudo apt-get install docker.io docker-compose cron postgresql-client
   ```

2. **Configure Environment**
   ```bash
   # Copy environment template
   cp .env.backup .env
   
   # Edit configuration
   nano .env
   ```

3. **Setup Directories**
   ```bash
   # Create backup directories
   sudo mkdir -p /var/backups/timetracking/{database,files,logs}
   sudo chown -R $USER:$USER /var/backups/timetracking
   ```

4. **Install Scripts**
   ```bash
   # Make scripts executable
   chmod +x scripts/*.sh
   
   # Create symbolic links
   sudo ln -sf $(pwd)/scripts/backup-system.sh /usr/local/bin/backup-system
   sudo ln -sf $(pwd)/scripts/backup-restore.sh /usr/local/bin/backup-restore
   ```

5. **Setup Cron Jobs**
   ```bash
   # Install cron jobs
   crontab scripts/backup-crontab
   ```

6. **Start Monitoring**
   ```bash
   # Start monitoring services
   docker-compose -f docker-compose.backup.yml up -d
   ```

## Configuration

### Environment Variables

Key configuration options in `.env.backup`:

```bash
# Backup retention
BACKUP_RETENTION_DAYS=30

# Notification settings
NOTIFICATION_EMAIL=admin@company.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Alert thresholds
BACKUP_MAX_AGE_HOURS=26
DISK_USAGE_WARNING_PERCENT=80
```

### Backup Schedule

Default schedule (configurable in `backup-crontab`):

- **Daily Backup**: 2:00 AM
- **Weekly Backup**: Sunday 3:00 AM  
- **Monthly Backup**: 1st of month 4:00 AM
- **Health Check**: Every 6 hours
- **Validation**: Daily 6:00 AM

## Usage

### Manual Backup

```bash
# Run immediate backup
backup-system

# Run with specific type
backup-system weekly
backup-system monthly
```

### Restore Data

```bash
# Interactive restoration
backup-restore

# Command line restoration
backup-restore cli database /var/backups/timetracking/database/backup_20240101_120000.sql.gz
backup-restore cli files /var/backups/timetracking/files/backup_20240101_120000.tar.gz
```

### Health Monitoring

```bash
# Check system health
backup-health-check

# Validate backups
backup-validation

# View metrics
backup-metrics generate
```

### List Backups

```bash
# List available backups
backup-restore list

# View backup directory
ls -la /var/backups/timetracking/database/
ls -la /var/backups/timetracking/files/
```

## Monitoring

### Grafana Dashboard

Access the backup monitoring dashboard:
- URL: `http://localhost:3001`
- Username: `admin`
- Password: Set in `GRAFANA_PASSWORD` environment variable

Dashboard includes:
- Backup status overview
- Disk usage monitoring
- Success/failure rates
- Backup file sizes
- Validation results

### Prometheus Metrics

Available metrics:
- `backup_last_success_timestamp` - Last successful backup time
- `backup_disk_free_bytes` - Available disk space
- `backup_validation_success_rate` - Validation success percentage
- `backup_database_size_bytes` - Database backup size
- `backup_files_size_bytes` - File backup size

### Log Files

Monitor backup operations through logs:
- `/var/log/backup-system.log` - Main backup log
- `/var/log/backup-validation.log` - Validation log
- `/var/log/backup-health.log` - Health check log
- `/var/log/cron-backup.log` - Cron execution log

## Troubleshooting

### Common Issues

1. **Backup Failures**
   ```bash
   # Check logs
   tail -f /var/log/backup-system.log
   
   # Verify Docker containers
   docker ps
   
   # Test database connection
   docker exec timetracking_db pg_isready -U postgres
   ```

2. **Disk Space Issues**
   ```bash
   # Check disk usage
   df -h /var/backups/timetracking
   
   # Clean old backups manually
   find /var/backups/timetracking -name "*.gz" -mtime +30 -delete
   ```

3. **Permission Issues**
   ```bash
   # Fix backup directory permissions
   sudo chown -R $USER:$USER /var/backups/timetracking
   chmod -R 755 /var/backups/timetracking
   ```

4. **Cron Jobs Not Running**
   ```bash
   # Check cron service
   sudo systemctl status cron
   
   # View cron logs
   sudo journalctl -u cron
   
   # Test cron job manually
   /usr/local/bin/backup-system
   ```

### Health Check Failure Codes

- **1**: Recent backup missing
- **2**: Disk space insufficient
- **4**: Service issues
- **8**: Permission problems

### Recovery Procedures

1. **Database Corruption**
   ```bash
   # Stop application
   docker stop timetracking_app
   
   # Restore from latest backup
   backup-restore cli database $(ls -t /var/backups/timetracking/database/*.gz | head -1)
   
   # Restart application
   docker start timetracking_app
   ```

2. **File System Issues**
   ```bash
   # Restore application files
   backup-restore cli files $(ls -t /var/backups/timetracking/files/*.gz | head -1)
   
   # Restart services
   docker-compose restart
   ```

## Maintenance

### Regular Tasks

1. **Weekly Review**
   - Check Grafana dashboard
   - Review backup logs
   - Verify disk space usage

2. **Monthly Tasks**
   - Test restore procedures
   - Update retention policies
   - Review and clean old logs

3. **Quarterly Tasks**
   - Full system restore test
   - Update backup scripts
   - Security review

### Backup Retention Management

```bash
# Adjust retention in cron job
# Edit: RETENTION_DAYS variable in backup-system.sh

# Manual cleanup
find /var/backups/timetracking -name "*.gz" -mtime +60 -delete
```

### Performance Optimization

1. **Backup Compression**
   - Database backups use gzip compression
   - File backups use tar with gzip

2. **Parallel Operations**
   - Database and file backups run in sequence
   - Consider parallel execution for large datasets

3. **Storage Optimization**
   - Implement incremental backups for large files
   - Use deduplication for similar backup content

## Security

### Data Encryption

All backups are stored with:
- File system level encryption
- Database connection encryption
- Secure backup validation

### Access Control

- Backup files owned by backup user
- Limited access permissions (755)
- Secure storage location

### Network Security

- Monitoring services on private network
- SSL/TLS for web interfaces
- Firewall rules for monitoring ports

## Support

### Getting Help

1. Check logs for error messages
2. Review this documentation
3. Run health checks for diagnosis
4. Contact system administrator

### Reporting Issues

Include the following information:
- Error messages from logs
- System configuration
- Recent changes or updates
- Output from health check script