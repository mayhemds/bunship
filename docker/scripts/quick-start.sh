#!/bin/bash
# ============================================
# BunShip Quick Start Script
# Sets up and runs BunShip in Docker
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
 ____              ____  _     _
|  _ \            / ___|| |__ (_)_ __
| |_) |_   _ _ __\ `--.| '_ \| | '_ \
|  _ <| | | | '_ \\`--. \ | | | | |_) |
|_| \_\_|_|_|_| |_\___/_|_| |_|_| .__/
                                |_|
EOF
echo -e "${NC}"

echo "BunShip - Quick Start"
echo "======================================"
echo ""

# ============================================
# Environment Check
# ============================================
echo -e "${BLUE}[1/5]${NC} Checking environment..."

if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker and Docker Compose are installed"
echo ""

# ============================================
# Environment File Setup
# ============================================
echo -e "${BLUE}[2/5]${NC} Setting up environment..."

cd "$(dirname "$0")/../.."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓${NC} Created .env from .env.example"
        echo -e "${YELLOW}⚠${NC}  Please review .env and update with your values"
    else
        echo "Error: .env.example not found"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} .env file exists"
fi

# Generate JWT secrets if they contain defaults
if grep -q "change-in-production" .env; then
    echo -e "${YELLOW}⚠${NC}  Generating secure JWT secrets..."

    if command -v openssl &> /dev/null; then
        JWT_SECRET=$(openssl rand -base64 32)
        JWT_REFRESH_SECRET=$(openssl rand -base64 32)

        sed -i.bak "s|your-super-secret-jwt-key-min-32-chars-change-in-production|$JWT_SECRET|g" .env
        sed -i.bak "s|your-refresh-secret-key-min-32-chars-change-in-production|$JWT_REFRESH_SECRET|g" .env

        echo -e "${GREEN}✓${NC} Generated secure JWT secrets"
    else
        echo -e "${YELLOW}⚠${NC}  openssl not found, using default secrets (not secure!)"
    fi
fi

echo ""

# ============================================
# Pull Base Images
# ============================================
echo -e "${BLUE}[3/5]${NC} Pulling base images..."

docker-compose -f docker/docker-compose.yml pull redis

echo -e "${GREEN}✓${NC} Base images ready"
echo ""

# ============================================
# Build Application
# ============================================
echo -e "${BLUE}[4/5]${NC} Building BunShip API..."

docker-compose -f docker/docker-compose.yml build api

echo -e "${GREEN}✓${NC} Build complete"
echo ""

# ============================================
# Start Services
# ============================================
echo -e "${BLUE}[5/5]${NC} Starting services..."

docker-compose -f docker/docker-compose.yml up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 5

# Check health
if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API is healthy"
else
    echo -e "${YELLOW}⚠${NC}  API is starting (may take a few seconds)..."
fi

echo ""
echo "======================================"
echo -e "${GREEN}BunShip is running!${NC}"
echo "======================================"
echo ""
echo "Services:"
echo "  • API:     http://localhost:3000"
echo "  • Swagger: http://localhost:3000/swagger"
echo "  • Redis:   localhost:6379"
echo ""
echo "Useful commands:"
echo "  • View logs:        docker-compose -f docker/docker-compose.yml logs -f"
echo "  • Stop services:    docker-compose -f docker/docker-compose.yml down"
echo "  • Restart:          docker-compose -f docker/docker-compose.yml restart"
echo "  • Run migrations:   docker-compose -f docker/docker-compose.yml exec api bun run db:migrate"
echo ""
echo "Documentation: docker/README.md"
echo ""

# Open browser (optional)
if [ "$1" = "--open" ]; then
    echo "Opening browser..."
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000/swagger
    elif command -v open &> /dev/null; then
        open http://localhost:3000/swagger
    fi
fi
