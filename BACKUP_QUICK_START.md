# Quick Setup Guide: Automated Backup System

## Production Deployment Checklist

### 1. Pre-deployment Setup
```bash
# Ensure Docker and Docker Compose are installed
docker --version
docker-compose --version

# Test backup system components
bash scripts/test-backup-system.sh
```

### 2. Configure Environment
```bash
# Copy and edit environment configuration
cp .env.backup .env

# Edit configuration values
nano .env
```

**Required Environment Variables:**
- `DB_PASSWORD` - Database password
- `NOTIFICATION_EMAIL` - Admin email for alerts
- `GRAFANA_PASSWORD` - Grafana admin password
- `SLACK_WEBHOOK_URL` - Slack notifications (optional)

### 3. Deploy Backup System
```bash
# Run automated deployment
sudo bash scripts/deploy-backup-system.sh

# Verify deployment
backup-health-check
```

### 4. Access Monitoring Dashboard
- **Grafana**: http://localhost:3001
  - Username: `admin`
  - Password: Set in `GRAFANA_PASSWORD`
- **Prometheus**: http://localhost:9090

### 5. Test Backup Operations
```bash
# Run manual backup
backup-system

# List created backups
backup-restore list

# Test restoration (dry run)
backup-restore cli database /var/backups/timetracking/database/latest_backup.sql.gz
```

### 6. Verify Automated Schedule
```bash
# Check cron jobs are installed
crontab -l | grep backup

# View backup schedule
cat scripts/backup-crontab
```

## Backup Schedule
- **Daily Backup**: 2:00 AM
- **Weekly Backup**: Sunday 3:00 AM
- **Monthly Backup**: 1st of month 4:00 AM
- **Health Check**: Every 6 hours
- **Validation**: Daily 6:00 AM

## Quick Commands
```bash
# Manual backup
backup-system

# Restore from backup
backup-restore

# Check system health
backup-health-check

# Validate backups
backup-validation

# View metrics
backup-metrics generate
```

## File Locations
- **Backups**: `/var/backups/timetracking/`
- **Logs**: `/var/log/backup-*.log`
- **Scripts**: `/usr/local/bin/backup-*`
- **Config**: `/etc/cron.d/backup-*`

## Troubleshooting
1. **Check logs**: `tail -f /var/log/backup-system.log`
2. **Verify containers**: `docker ps`
3. **Test database**: `docker exec timetracking_db pg_isready`
4. **Check disk space**: `df -h /var/backups/timetracking`

## Support
- Documentation: `docs/BACKUP_SYSTEM.md`
- Test system: `bash scripts/test-backup-system.sh`
- Health check: `backup-health-check`

---
**Ready for Production**: ✅ All backup system components are tested and ready for deployment.