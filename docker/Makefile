# ============================================
# BunShip Docker - Convenience Makefile
# ============================================

.PHONY: help build up down logs shell test clean prod-up prod-down migrate

# Variables
COMPOSE_FILE := docker-compose.yml
COMPOSE_PROD := docker-compose.yml -f docker-compose.prod.yml
PROJECT_NAME := bunship
IMAGE_NAME := bunship-api
VERSION ?= latest

# Default target
help:
	@echo "BunShip Docker Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make build          - Build all Docker images"
	@echo "  make up             - Start all services in development mode"
	@echo "  make down           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo "  make logs           - View logs from all services"
	@echo "  make logs-api       - View API logs only"
	@echo "  make shell          - Open shell in API container"
	@echo "  make migrate        - Run database migrations"
	@echo ""
	@echo "Production:"
	@echo "  make prod-build     - Build production images"
	@echo "  make prod-up        - Start services in production mode"
	@echo "  make prod-down      - Stop production services"
	@echo "  make prod-logs      - View production logs"
	@echo ""
	@echo "Testing:"
	@echo "  make test           - Run tests in container"
	@echo "  make test-watch     - Run tests in watch mode"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean          - Remove all containers and volumes"
	@echo "  make prune          - Remove all unused Docker resources"
	@echo "  make ps             - List all running containers"
	@echo ""

# ============================================
# Development
# ============================================

build:
	@echo "Building Docker images..."
	docker-compose -f $(COMPOSE_FILE) build

up:
	@echo "Starting services in development mode..."
	docker-compose -f $(COMPOSE_FILE) up -d
	@echo "Services started. API available at http://localhost:3000"
	@echo "Run 'make logs' to view logs"

down:
	@echo "Stopping all services..."
	docker-compose -f $(COMPOSE_FILE) down

restart: down up

logs:
	docker-compose -f $(COMPOSE_FILE) logs -f

logs-api:
	docker-compose -f $(COMPOSE_FILE) logs -f api

logs-worker:
	docker-compose -f $(COMPOSE_FILE) logs -f worker

logs-redis:
	docker-compose -f $(COMPOSE_FILE) logs -f redis

shell:
	docker-compose -f $(COMPOSE_FILE) exec api /bin/sh

shell-worker:
	docker-compose -f $(COMPOSE_FILE) exec worker /bin/sh

migrate:
	@echo "Running database migrations..."
	docker-compose -f $(COMPOSE_FILE) exec api bun run db:migrate

seed:
	@echo "Seeding database..."
	docker-compose -f $(COMPOSE_FILE) exec api bun run db:seed

# ============================================
# Production
# ============================================

prod-build:
	@echo "Building production images..."
	docker-compose -f $(COMPOSE_PROD) build
	docker tag $(IMAGE_NAME):latest $(IMAGE_NAME):$(VERSION)

prod-up:
	@echo "Starting services in production mode..."
	docker-compose -f $(COMPOSE_PROD) up -d
	@echo "Production services started"

prod-down:
	@echo "Stopping production services..."
	docker-compose -f $(COMPOSE_PROD) down

prod-logs:
	docker-compose -f $(COMPOSE_PROD) logs -f

prod-scale:
	@echo "Scaling API to 3 instances..."
	docker-compose -f $(COMPOSE_PROD) up -d --scale api=3

# ============================================
# Testing
# ============================================

test:
	@echo "Running tests..."
	docker-compose -f $(COMPOSE_FILE) exec api bun test

test-watch:
	@echo "Running tests in watch mode..."
	docker-compose -f $(COMPOSE_FILE) exec api bun test --watch

test-coverage:
	@echo "Running tests with coverage..."
	docker-compose -f $(COMPOSE_FILE) exec api bun test --coverage

# ============================================
# Maintenance
# ============================================

ps:
	docker-compose -f $(COMPOSE_FILE) ps

clean:
	@echo "Removing all containers and volumes..."
	docker-compose -f $(COMPOSE_FILE) down -v
	@echo "Cleanup complete"

prune:
	@echo "Removing all unused Docker resources..."
	docker system prune -af --volumes
	@echo "Prune complete"

health:
	@echo "Checking service health..."
	@curl -f http://localhost:3000/health || echo "API health check failed"
	@docker-compose -f $(COMPOSE_FILE) exec redis redis-cli ping || echo "Redis health check failed"

# ============================================
# Registry Operations
# ============================================

push:
	@echo "Pushing image to registry..."
	docker push $(IMAGE_NAME):$(VERSION)
	docker push $(IMAGE_NAME):latest

pull:
	@echo "Pulling image from registry..."
	docker pull $(IMAGE_NAME):$(VERSION)

# ============================================
# Diagnostics
# ============================================

stats:
	docker stats

inspect-api:
	docker-compose -f $(COMPOSE_FILE) exec api bun run --version
	docker-compose -f $(COMPOSE_FILE) exec api node --version || echo "Node not installed (Bun only)"

disk-usage:
	docker system df

network-inspect:
	docker network inspect $(PROJECT_NAME)_bunship-network
