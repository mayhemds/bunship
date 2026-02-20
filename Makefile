.PHONY: help install dev build test lint format clean docker ci

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)BunShip - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	bun install

dev: ## Start development server
	@echo "$(BLUE)Starting development server...$(NC)"
	bun run dev

dev-all: ## Start all development servers
	@echo "$(BLUE)Starting all development servers...$(NC)"
	bun run dev:all

build: ## Build all packages
	@echo "$(BLUE)Building packages...$(NC)"
	bun run build

start: ## Start production server
	@echo "$(BLUE)Starting production server...$(NC)"
	bun run start

test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	bun run test

test-unit: ## Run unit tests
	@echo "$(BLUE)Running unit tests...$(NC)"
	bun run test:unit

test-integration: ## Run integration tests
	@echo "$(BLUE)Running integration tests...$(NC)"
	bun run test:integration

test-coverage: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	bun run test:coverage

lint: ## Run linter
	@echo "$(BLUE)Running linter...$(NC)"
	bun run lint

lint-fix: ## Fix linting issues
	@echo "$(BLUE)Fixing linting issues...$(NC)"
	bun run lint:fix

format: ## Format code
	@echo "$(BLUE)Formatting code...$(NC)"
	bun run format

format-check: ## Check code formatting
	@echo "$(BLUE)Checking code formatting...$(NC)"
	bun run format:check

typecheck: ## Run type checking
	@echo "$(BLUE)Running type check...$(NC)"
	bun run typecheck

clean: ## Clean build artifacts and node_modules
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	bun run clean

# Database commands
db-generate: ## Generate database migrations
	@echo "$(BLUE)Generating database migrations...$(NC)"
	bun run db:generate

db-migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(NC)"
	bun run db:migrate

db-push: ## Push database schema
	@echo "$(BLUE)Pushing database schema...$(NC)"
	bun run db:push

db-seed: ## Seed database
	@echo "$(BLUE)Seeding database...$(NC)"
	bun run db:seed

db-studio: ## Open database studio
	@echo "$(BLUE)Opening database studio...$(NC)"
	bun run db:studio

db-reset: ## Reset database
	@echo "$(YELLOW)Resetting database...$(NC)"
	bun run db:reset

# Docker commands
docker-build: ## Build Docker image
	@echo "$(BLUE)Building Docker image...$(NC)"
	docker build -f Dockerfile -t bunship-api:latest .

docker-run: ## Run Docker container
	@echo "$(BLUE)Running Docker container...$(NC)"
	docker run -p 3000:3000 --env-file .env bunship-api:latest

docker-dev: ## Start development environment with Docker Compose
	@echo "$(BLUE)Starting development environment...$(NC)"
	docker compose -f .github/docker-compose.ci.yml up

docker-down: ## Stop Docker Compose services
	@echo "$(BLUE)Stopping Docker Compose services...$(NC)"
	docker compose -f .github/docker-compose.ci.yml down

# CI/CD commands
ci: ## Run full CI pipeline locally
	@echo "$(BLUE)Running CI pipeline...$(NC)"
	@$(MAKE) lint
	@$(MAKE) typecheck
	@$(MAKE) test
	@$(MAKE) build
	@echo "$(GREEN)✓ CI pipeline completed successfully$(NC)"

ci-docker: ## Run tests in Docker (simulates CI environment)
	@echo "$(BLUE)Running tests in Docker...$(NC)"
	docker compose -f .github/docker-compose.ci.yml run --rm test-runner

pre-commit: ## Run pre-commit checks
	@echo "$(BLUE)Running pre-commit checks...$(NC)"
	@$(MAKE) format-check
	@$(MAKE) lint
	@$(MAKE) typecheck
	@echo "$(GREEN)✓ Pre-commit checks passed$(NC)"

pre-push: ## Run pre-push checks
	@echo "$(BLUE)Running pre-push checks...$(NC)"
	@$(MAKE) pre-commit
	@$(MAKE) test
	@echo "$(GREEN)✓ Pre-push checks passed$(NC)"

# Security commands
audit: ## Run security audit
	@echo "$(BLUE)Running security audit...$(NC)"
	bun audit

# Utility commands
version: ## Show versions
	@echo "$(BLUE)Versions:$(NC)"
	@echo "Bun:        $$(bun --version)"
	@echo "Node:       $$(node --version 2>/dev/null || echo 'N/A')"
	@echo "Docker:     $$(docker --version 2>/dev/null || echo 'N/A')"

update-deps: ## Update dependencies
	@echo "$(BLUE)Updating dependencies...$(NC)"
	bun update

check-updates: ## Check for dependency updates
	@echo "$(BLUE)Checking for updates...$(NC)"
	bun outdated
