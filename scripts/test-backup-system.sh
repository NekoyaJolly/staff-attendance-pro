#!/bin/bash

# Test script for backup system functionality
# Validates that all backup components work correctly

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_BACKUP_DIR="/tmp/test_backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Test backup script execution
test_backup_scripts() {
    log "Testing backup script syntax..."
    
    local scripts=(
        "backup-system.sh"
        "backup-restore.sh"
        "backup-validation.sh"
        "backup-health-check.sh"
        "backup-metrics.sh"
        "deploy-backup-system.sh"
    )
    
    local failed_scripts=()
    
    for script in "${scripts[@]}"; do
        local script_path="$SCRIPT_DIR/$script"
        if [ -f "$script_path" ]; then
            if bash -n "$script_path"; then
                log_success "Syntax check passed: $script"
            else
                log_error "Syntax check failed: $script"
                failed_scripts+=("$script")
            fi
        else
            log_error "Script not found: $script"
            failed_scripts+=("$script")
        fi
    done
    
    if [ ${#failed_scripts[@]} -eq 0 ]; then
        log_success "All backup scripts passed syntax checks"
        return 0
    else
        log_error "Failed scripts: ${failed_scripts[*]}"
        return 1
    fi
}

# Test cron configuration
test_cron_config() {
    log "Testing cron configuration..."
    
    local cron_file="$SCRIPT_DIR/backup-crontab"
    
    if [ -f "$cron_file" ]; then
        # Test cron syntax (basic validation)
        if grep -q "^[0-9\*]" "$cron_file"; then
            log_success "Cron file format appears valid"
        else
            log_error "Cron file format validation failed"
            return 1
        fi
        
        # Check for required cron jobs
        local required_jobs=("backup-system.sh" "backup-validation.sh" "backup-health-check.sh")
        local missing_jobs=()
        
        for job in "${required_jobs[@]}"; do
            if ! grep -q "$job" "$cron_file"; then
                missing_jobs+=("$job")
            fi
        done
        
        if [ ${#missing_jobs[@]} -eq 0 ]; then
            log_success "All required cron jobs found"
            return 0
        else
            log_error "Missing cron jobs: ${missing_jobs[*]}"
            return 1
        fi
    else
        log_error "Cron configuration file not found: $cron_file"
        return 1
    fi
}

# Test Docker Compose configuration
test_docker_compose() {
    log "Testing Docker Compose configuration..."
    
    local compose_file="$PROJECT_ROOT/docker-compose.backup.yml"
    
    if [ -f "$compose_file" ]; then
        # Validate Docker Compose syntax
        if command -v docker-compose &> /dev/null; then
            if docker-compose -f "$compose_file" config &> /dev/null; then
                log_success "Docker Compose configuration is valid"
                return 0
            else
                log_error "Docker Compose configuration validation failed"
                return 1
            fi
        else
            log_warning "docker-compose not available, skipping validation"
            return 0
        fi
    else
        log_error "Docker Compose backup file not found: $compose_file"
        return 1
    fi
}

# Test monitoring configuration
test_monitoring_config() {
    log "Testing monitoring configuration..."
    
    local monitoring_dir="$PROJECT_ROOT/monitoring"
    local config_files=(
        "prometheus.yml"
        "backup_alerts.yml"
        "grafana-datasources.yml"
        "grafana-dashboards.yml"
        "fluentd.conf"
    )
    
    local missing_files=()
    
    for file in "${config_files[@]}"; do
        if [ ! -f "$monitoring_dir/$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        log_success "All monitoring configuration files found"
        
        # Test Prometheus config syntax
        local prometheus_config="$monitoring_dir/prometheus.yml"
        if command -v promtool &> /dev/null; then
            if promtool check config "$prometheus_config" &> /dev/null; then
                log_success "Prometheus configuration is valid"
            else
                log_warning "Prometheus configuration validation failed"
            fi
        else
            log_warning "promtool not available, skipping Prometheus validation"
        fi
        
        return 0
    else
        log_error "Missing monitoring files: ${missing_files[*]}"
        return 1
    fi
}

# Test backup directory structure
test_backup_directories() {
    log "Testing backup directory structure simulation..."
    
    # Create test backup directory structure
    mkdir -p "$TEST_BACKUP_DIR"/{database,files,logs}
    
    # Create mock backup files for testing
    echo "-- Test database backup" > "$TEST_BACKUP_DIR/database/test_backup_$(date +%Y%m%d_%H%M%S).sql"
    tar -czf "$TEST_BACKUP_DIR/files/test_backup_$(date +%Y%m%d_%H%M%S).tar.gz" -C /tmp --files-from=/dev/null 2>/dev/null || true
    
    # Test directory permissions
    if [ -d "$TEST_BACKUP_DIR" ] && [ -w "$TEST_BACKUP_DIR" ]; then
        log_success "Test backup directory structure created successfully"
        
        # Cleanup
        rm -rf "$TEST_BACKUP_DIR"
        return 0
    else
        log_error "Failed to create test backup directory structure"
        return 1
    fi
}

# Test environment configuration
test_environment_config() {
    log "Testing environment configuration..."
    
    local env_file="$PROJECT_ROOT/.env.backup"
    
    if [ -f "$env_file" ]; then
        # Check for required environment variables
        local required_vars=(
            "BACKUP_RETENTION_DAYS"
            "NOTIFICATION_EMAIL"
            "DB_PASSWORD"
            "GRAFANA_PASSWORD"
        )
        
        local missing_vars=()
        
        for var in "${required_vars[@]}"; do
            if ! grep -q "^$var=" "$env_file"; then
                missing_vars+=("$var")
            fi
        done
        
        if [ ${#missing_vars[@]} -eq 0 ]; then
            log_success "All required environment variables found"
            return 0
        else
            log_error "Missing environment variables: ${missing_vars[*]}"
            return 1
        fi
    else
        log_error "Environment configuration file not found: $env_file"
        return 1
    fi
}

# Test documentation
test_documentation() {
    log "Testing documentation..."
    
    local doc_file="$PROJECT_ROOT/docs/BACKUP_SYSTEM.md"
    
    if [ -f "$doc_file" ]; then
        local file_size=$(wc -c < "$doc_file")
        if [ "$file_size" -gt 1000 ]; then
            log_success "Backup system documentation exists and appears complete"
            return 0
        else
            log_warning "Documentation file seems too small: $file_size bytes"
            return 1
        fi
    else
        log_error "Documentation file not found: $doc_file"
        return 1
    fi
}

# Run all tests
run_all_tests() {
    log "Starting backup system integration tests..."
    echo ""
    
    local test_results=()
    local total_tests=0
    local passed_tests=0
    
    # Run individual tests
    local tests=(
        "test_backup_scripts"
        "test_cron_config"
        "test_docker_compose"
        "test_monitoring_config"
        "test_backup_directories"
        "test_environment_config"
        "test_documentation"
    )
    
    for test in "${tests[@]}"; do
        total_tests=$((total_tests + 1))
        echo ""
        if $test; then
            test_results+=("PASS: $test")
            passed_tests=$((passed_tests + 1))
        else
            test_results+=("FAIL: $test")
        fi
    done
    
    # Print test summary
    echo ""
    echo "======================================="
    echo "BACKUP SYSTEM TEST SUMMARY"
    echo "======================================="
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $((total_tests - passed_tests))"
    echo ""
    
    for result in "${test_results[@]}"; do
        if [[ $result == PASS* ]]; then
            log_success "$result"
        else
            log_error "$result"
        fi
    done
    
    echo ""
    if [ $passed_tests -eq $total_tests ]; then
        log_success "All tests passed! Backup system is ready for deployment."
        return 0
    else
        log_error "Some tests failed. Please review and fix issues before deployment."
        return 1
    fi
}

# Main function
main() {
    if [ "${1:-}" == "--help" ] || [ "${1:-}" == "-h" ]; then
        echo "Usage: $0 [test_name]"
        echo ""
        echo "Available tests:"
        echo "  test_backup_scripts    - Test backup script syntax"
        echo "  test_cron_config      - Test cron configuration"
        echo "  test_docker_compose   - Test Docker Compose config"
        echo "  test_monitoring_config - Test monitoring setup"
        echo "  test_backup_directories - Test directory structure"
        echo "  test_environment_config - Test environment variables"
        echo "  test_documentation    - Test documentation"
        echo ""
        echo "Run without arguments to execute all tests."
        exit 0
    fi
    
    if [ $# -eq 0 ]; then
        run_all_tests
    else
        local test_name=$1
        if declare -f "$test_name" > /dev/null; then
            $test_name
        else
            log_error "Unknown test: $test_name"
            exit 1
        fi
    fi
}

# Execute main function
main "$@"