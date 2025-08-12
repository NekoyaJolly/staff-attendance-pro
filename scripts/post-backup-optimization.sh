#!/bin/bash

# Post-Backup Database Optimization Script
# Optimizes database performance after backup operations

set -euo pipefail

# Configuration
DB_CONTAINER_NAME="timetracking_db"
LOG_FILE="/var/log/post-backup-optimization.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [OPTIMIZATION] $1" | tee -a "$LOG_FILE"
}

# Database optimization
optimize_database() {
    log "Starting post-backup database optimization..."
    
    # Vacuum and analyze the database
    docker exec "$DB_CONTAINER_NAME" psql -U postgres -d timetracking_db -c "VACUUM ANALYZE;" 2>/dev/null
    
    # Update table statistics
    docker exec "$DB_CONTAINER_NAME" psql -U postgres -d timetracking_db -c "ANALYZE;" 2>/dev/null
    
    # Reindex if needed (only on weekends to avoid performance impact)
    if [ "$(date +%u)" -ge 6 ]; then
        log "Weekend reindexing..."
        docker exec "$DB_CONTAINER_NAME" psql -U postgres -d timetracking_db -c "REINDEX DATABASE timetracking_db;" 2>/dev/null
    fi
    
    log "Database optimization completed"
}

# Execute optimization
optimize_database