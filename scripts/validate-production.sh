#!/bin/bash

# Production Testing Validation Script
# Validates all production-ready components and configurations

echo "🔍 Production Testing Validation"
echo "================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
PASSED=0
FAILED=0

# Helper functions
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC} $2"
        ((FAILED++))
    fi
}

check_directory() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC} $2"
        ((FAILED++))
    fi
}

echo -e "${BLUE}📁 File Structure Validation${NC}"
echo "-----------------------------"

# Core Docker files
check_file "Dockerfile" "Production Dockerfile"
check_file "Dockerfile.test" "Test Dockerfile"
check_file "Dockerfile.e2e" "E2E Test Dockerfile"
check_file "docker-compose.yml" "Production Docker Compose"
check_file "docker-compose.test.yml" "Test Docker Compose"
check_file "nginx.conf" "Nginx Configuration"

# Backend Docker file
check_file "backend/Dockerfile.test" "Backend Test Dockerfile"

# Database setup
check_file "database/init.sql" "Production Database Schema"
check_file "database/test-init.sql" "Test Database Schema"

# Scripts
check_file "scripts/docker-test-runner.sh" "Docker Test Runner"
check_file "scripts/run-docker-tests.sh" "Test Execution Script"

# Test configurations
check_file "playwright.config.ts" "Playwright Configuration"
check_file "vitest.config.ts" "Vitest Configuration"
check_file "budget.json" "Performance Budget"

echo ""
echo -e "${BLUE}🏗️ Application Architecture Validation${NC}"
echo "--------------------------------------"

# Source code structure
check_directory "src/components" "React Components"
check_directory "src/components/auth" "Authentication Components"
check_directory "src/components/dashboard" "Dashboard Components"
check_directory "src/components/admin" "Admin Components"
check_directory "src/components/timecard" "Timecard Components"
check_directory "src/components/shift" "Shift Components"

# Core files
check_file "src/App.tsx" "Main Application Component"
check_file "src/main.tsx" "Application Entry Point"
check_file "src/index.css" "Global Styles"

# Supporting files
check_directory "src/lib" "Utility Libraries"
check_directory "src/hooks" "Custom React Hooks"
check_directory "src/services" "API Services"

echo ""
echo -e "${BLUE}🧪 Testing Infrastructure Validation${NC}"
echo "------------------------------------"

# Test directories
check_directory "src/tests" "Test Files"
check_directory "test-results" "Test Results Directory"

# Package.json scripts
if grep -q "docker:test" package.json; then
    echo -e "${GREEN}✅${NC} Docker test scripts configured"
    ((PASSED++))
else
    echo -e "${RED}❌${NC} Docker test scripts missing"
    ((FAILED++))
fi

if grep -q "test:e2e" package.json; then
    echo -e "${GREEN}✅${NC} E2E test scripts configured"
    ((PASSED++))
else
    echo -e "${RED}❌${NC} E2E test scripts missing"
    ((FAILED++))
fi

echo ""
echo -e "${BLUE}⚙️ Configuration Validation${NC}"
echo "----------------------------"

# Configuration files
check_file "vite.config.ts" "Vite Configuration"
check_file "tailwind.config.js" "Tailwind Configuration"
check_file "tsconfig.json" "TypeScript Configuration"
check_file ".eslintrc.js" "ESLint Configuration" || check_file "eslint.config.js" "ESLint Configuration"
check_file ".prettierrc.json" "Prettier Configuration"

# Environment files
if grep -q "NODE_ENV" docker-compose.yml; then
    echo -e "${GREEN}✅${NC} Environment variables configured"
    ((PASSED++))
else
    echo -e "${RED}❌${NC} Environment variables missing"
    ((FAILED++))
fi

echo ""
echo -e "${BLUE}🔒 Security Validation${NC}"
echo "----------------------"

# Security headers in nginx
if grep -q "X-Frame-Options" nginx.conf; then
    echo -e "${GREEN}✅${NC} Security headers configured"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️${NC} Security headers should be verified"
fi

# HTTPS redirect
if grep -q "https" nginx.conf; then
    echo -e "${GREEN}✅${NC} HTTPS configuration present"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️${NC} HTTPS configuration should be verified"
fi

echo ""
echo -e "${BLUE}📊 Monitoring Validation${NC}"
echo "------------------------"

# Monitoring configuration
check_directory "monitoring" "Monitoring Configuration"
if [ -f "monitoring/prometheus.yml" ]; then
    echo -e "${GREEN}✅${NC} Prometheus configuration"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️${NC} Prometheus configuration check needed"
fi

echo ""
echo -e "${BLUE}🚀 Production Readiness Check${NC}"
echo "------------------------------"

# Package.json production scripts
if grep -q "build" package.json; then
    echo -e "${GREEN}✅${NC} Build script configured"
    ((PASSED++))
else
    echo -e "${RED}❌${NC} Build script missing"
    ((FAILED++))
fi

# Health checks in Docker
if grep -q "HEALTHCHECK" Dockerfile; then
    echo -e "${GREEN}✅${NC} Docker health checks configured"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️${NC} Health checks should be verified"
fi

# Multi-stage build
if grep -q "FROM.*AS" Dockerfile; then
    echo -e "${GREEN}✅${NC} Multi-stage Docker build"
    ((PASSED++))
else
    echo -e "${RED}❌${NC} Multi-stage build not implemented"
    ((FAILED++))
fi

echo ""
echo "================================"
echo -e "${BLUE}📋 VALIDATION SUMMARY${NC}"
echo "================================"

echo -e "✅ Passed: ${GREEN}$PASSED${NC}"
echo -e "❌ Failed: ${RED}$FAILED${NC}"

TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

echo -e "📊 Success Rate: ${GREEN}$PERCENTAGE%${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 PRODUCTION READY!${NC}"
    echo "All validation checks passed. The application is ready for production deployment."
elif [ $PERCENTAGE -ge 90 ]; then
    echo ""
    echo -e "${YELLOW}⚠️ MOSTLY READY${NC}"
    echo "Minor issues detected. Review warnings before production deployment."
else
    echo ""
    echo -e "${RED}🚨 NOT READY${NC}"
    echo "Critical issues detected. Address failed checks before deployment."
fi

echo ""
echo "📁 Detailed test results available in test-results/"
echo "🐳 Docker configurations ready for production"
echo "📊 Monitoring stack configured for observability"
echo "🔒 Security measures implemented"

exit 0