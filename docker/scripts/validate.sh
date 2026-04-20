#!/bin/bash
# ============================================
# Docker Configuration Validator
# Validates Docker setup before deployment
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "BunShip Docker Validation"
echo "======================================"
echo ""

# Track validation status
ERRORS=0
WARNINGS=0

# ============================================
# Check Docker Installation
# ============================================
echo "Checking Docker installation..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓${NC} Docker installed: $DOCKER_VERSION"
else
    echo -e "${RED}✗${NC} Docker is not installed"
    ERRORS=$((ERRORS + 1))
fi

if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo -e "${GREEN}✓${NC} Docker Compose installed: $COMPOSE_VERSION"
else
    echo -e "${RED}✗${NC} Docker Compose is not installed"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ============================================
# Check Docker Service
# ============================================
echo "Checking Docker service..."
if docker info &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker service is running"
else
    echo -e "${RED}✗${NC} Docker service is not running"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ============================================
# Check Required Files
# ============================================
echo "Checking required files..."

REQUIRED_FILES=(
    "docker/Dockerfile.api"
    "docker/docker-compose.yml"
    "docker/docker-compose.prod.yml"
    "docker/.dockerignore"
    "package.json"
    "apps/api/package.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "../$file" ]; then
        echo -e "${GREEN}✓${NC} $file exists"
    else
        echo -e "${RED}✗${NC} $file is missing"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# ============================================
# Check Environment File
# ============================================
echo "Checking environment configuration..."

if [ -f "../.env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"

    # Check for required variables
    REQUIRED_VARS=(
        "NODE_ENV"
        "DATABASE_URL"
        "REDIS_URL"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
    )

    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" ../.env; then
            echo -e "${GREEN}✓${NC} $var is set"
        else
            echo -e "${RED}✗${NC} $var is not set in .env"
            ERRORS=$((ERRORS + 1))
        fi
    done

    # Check for weak secrets
    if grep -q "change-in-production" ../.env; then
        echo -e "${YELLOW}⚠${NC}  Warning: Default secrets detected in .env"
        WARNINGS=$((WARNINGS + 1))
    fi

else
    echo -e "${YELLOW}⚠${NC}  .env file not found (will use defaults)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ============================================
# Validate Dockerfile
# ============================================
echo "Validating Dockerfile..."

if [ -f "../docker/Dockerfile.api" ]; then
    # Check for security best practices
    if grep -q "USER bunship" ../docker/Dockerfile.api; then
        echo -e "${GREEN}✓${NC} Non-root user configured"
    else
        echo -e "${YELLOW}⚠${NC}  Warning: Running as root user"
        WARNINGS=$((WARNINGS + 1))
    fi

    if grep -q "HEALTHCHECK" ../docker/Dockerfile.api; then
        echo -e "${GREEN}✓${NC} Health check configured"
    else
        echo -e "${YELLOW}⚠${NC}  Warning: No health check configured"
        WARNINGS=$((WARNINGS + 1))
    fi

    if grep -q "EXPOSE" ../docker/Dockerfile.api; then
        echo -e "${GREEN}✓${NC} Port exposure documented"
    else
        echo -e "${YELLOW}⚠${NC}  Warning: No EXPOSE instruction"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

echo ""

# ============================================
# Validate docker-compose.yml
# ============================================
echo "Validating docker-compose.yml..."

cd ../docker
if docker-compose config > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} docker-compose.yml is valid"
else
    echo -e "${RED}✗${NC} docker-compose.yml has syntax errors"
    ERRORS=$((ERRORS + 1))
fi
cd - > /dev/null

echo ""

# ============================================
# Check Network Requirements
# ============================================
echo "Checking network requirements..."

# Check if ports are available
PORTS=(3000 6379)
for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠${NC}  Warning: Port $port is already in use"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✓${NC} Port $port is available"
    fi
done

echo ""

# ============================================
# Check Disk Space
# ============================================
echo "Checking disk space..."

AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
echo "Available disk space: $AVAILABLE_SPACE"

if df -h . | awk 'NR==2 {exit ($5+0 >= 90)}'; then
    echo -e "${GREEN}✓${NC} Sufficient disk space"
else
    echo -e "${YELLOW}⚠${NC}  Warning: Low disk space (>90% used)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ============================================
# Security Checks
# ============================================
echo "Running security checks..."

# Check for exposed secrets in Dockerfile
if grep -r "SECRET\|PASSWORD\|TOKEN" ../docker/Dockerfile.api | grep -v "ENV" | grep -v "#" > /dev/null; then
    echo -e "${YELLOW}⚠${NC}  Warning: Potential secrets in Dockerfile"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓${NC} No hardcoded secrets in Dockerfile"
fi

# Check Docker socket permissions
if [ -S /var/run/docker.sock ]; then
    if [ -w /var/run/docker.sock ]; then
        echo -e "${GREEN}✓${NC} Docker socket is accessible"
    else
        echo -e "${RED}✗${NC} No write permission to Docker socket"
        ERRORS=$((ERRORS + 1))
    fi
fi

echo ""

# ============================================
# Production Readiness Checks
# ============================================
if [ "$NODE_ENV" = "production" ] || [ "$1" = "--production" ]; then
    echo "Running production readiness checks..."

    # Check for production environment
    if grep -q "NODE_ENV=production" ../.env; then
        echo -e "${GREEN}✓${NC} NODE_ENV set to production"
    else
        echo -e "${RED}✗${NC} NODE_ENV not set to production"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for SSL/TLS configuration
    if [ -f "../certs/cert.pem" ] && [ -f "../certs/key.pem" ]; then
        echo -e "${GREEN}✓${NC} SSL certificates found"
    else
        echo -e "${YELLOW}⚠${NC}  Warning: SSL certificates not found"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Check for resource limits
    if grep -q "deploy:" ../docker/docker-compose.prod.yml; then
        echo -e "${GREEN}✓${NC} Resource limits configured"
    else
        echo -e "${YELLOW}⚠${NC}  Warning: No resource limits configured"
        WARNINGS=$((WARNINGS + 1))
    fi

    echo ""
fi

# ============================================
# Summary
# ============================================
echo "======================================"
echo "Validation Summary"
echo "======================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "You can proceed with deployment."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo "Deployment is possible but consider addressing warnings."
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo ""
    echo "Please fix the errors before deployment."
    exit 1
fi
