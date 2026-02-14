# BunShip Docker Configuration - Complete Index

Complete guide to navigating the Docker configuration for BunShip.

## Quick Navigation

| Document                               | Purpose                  | When to Use                     |
| -------------------------------------- | ------------------------ | ------------------------------- |
| [README.md](README.md)                 | Main documentation       | Start here, general usage       |
| [DOCKER-SUMMARY.md](DOCKER-SUMMARY.md) | Executive overview       | Understanding what's included   |
| [ARCHITECTURE.md](ARCHITECTURE.md)     | Visual diagrams          | Understanding the system design |
| [DEPLOYMENT.md](DEPLOYMENT.md)         | Deployment guide         | Deploying to production         |
| [CHECKLIST.md](CHECKLIST.md)           | Pre-deployment checklist | Before any deployment           |

## File Structure

```
docker/
├── Core Configuration
│   ├── Dockerfile.api                      # Multi-stage production Dockerfile
│   ├── docker-compose.yml                  # Development orchestration
│   ├── docker-compose.prod.yml            # Production overrides
│   ├── docker-compose.test.yml            # Test environment
│   ├── docker-compose.override.example.yml # Local dev tools template
│   ├── .dockerignore                       # Build context exclusions
│   └── .env.example                        # Docker environment template
│
├── Automation
│   ├── Makefile                            # Convenience commands
│   └── scripts/
│       ├── validate.sh                     # Pre-deployment validation
│       └── quick-start.sh                  # One-command setup
│
├── Documentation
│   ├── README.md                           # Main documentation
│   ├── DOCKER-SUMMARY.md                   # Executive summary
│   ├── ARCHITECTURE.md                     # Architecture diagrams
│   ├── DEPLOYMENT.md                       # Deployment strategies
│   ├── CHECKLIST.md                        # Deployment checklist
│   └── INDEX.md                            # This file
│
└── CI/CD
    └── .github-workflows-example.yml       # GitHub Actions pipeline
```

## Getting Started Paths

### Path 1: Quick Start (5 minutes)

1. Read: [DOCKER-SUMMARY.md](DOCKER-SUMMARY.md) - Overview
2. Run: `./scripts/quick-start.sh` - Automated setup
3. Access: http://localhost:3000
4. Next: Review [README.md](README.md) for details

### Path 2: Production Deployment (1 hour)

1. Read: [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment strategies
2. Review: [CHECKLIST.md](CHECKLIST.md) - Deployment checklist
3. Validate: `./scripts/validate.sh --production`
4. Deploy: Follow deployment guide
5. Monitor: Set up monitoring and alerts

### Path 3: Understanding the System (30 minutes)

1. Read: [ARCHITECTURE.md](ARCHITECTURE.md) - System design
2. Read: [README.md](README.md) - Detailed documentation
3. Review: [Dockerfile.api](Dockerfile.api) - Build process
4. Review: [docker-compose.yml](docker-compose.yml) - Services
5. Experiment: Start services and explore

### Path 4: CI/CD Setup (45 minutes)

1. Copy: [.github-workflows-example.yml](.github-workflows-example.yml) to `.github/workflows/`
2. Configure: Set up GitHub secrets
3. Review: [DEPLOYMENT.md](DEPLOYMENT.md) - CI/CD section
4. Test: Push to staging branch
5. Deploy: Create release for production

## Configuration Files Explained

### Dockerfile.api

**Purpose**: Multi-stage build for production-ready API image

**Stages**:

- `base`: Common base with Alpine and Bun
- `deps`: Production dependencies only
- `builder`: Full build with all dependencies
- `runner`: Minimal production runtime

**Key Features**:

- Non-root user execution
- Health checks
- Optimized for layer caching
- Security hardening

**When to Modify**:

- Adding system dependencies
- Changing base image version
- Adjusting build process
- Adding security tools

### docker-compose.yml

**Purpose**: Development environment orchestration

**Services**:

- `api`: Main application server
- `redis`: Cache and queue
- `worker`: Background job processor

**Key Features**:

- Source code mounting (hot reload)
- Health checks
- Network isolation
- Volume persistence

**When to Modify**:

- Adding new services
- Changing port mappings
- Adjusting development tools
- Adding environment variables

### docker-compose.prod.yml

**Purpose**: Production configuration overrides

**Overrides**:

- Resource limits
- Restart policies
- Log configuration
- Replication count

**Key Features**:

- Multiple replicas
- Strict resource limits
- Log rotation
- No source mounting

**When to Modify**:

- Scaling services
- Adjusting resource limits
- Changing restart policies
- Production tuning

### docker-compose.test.yml

**Purpose**: Isolated test environment

**Services**:

- `test`: Test runner
- `redis-test`: Isolated Redis

**Key Features**:

- In-memory database
- Isolated network
- Coverage reports
- CI/CD ready

**When to Modify**:

- Changing test configuration
- Adding test dependencies
- Adjusting test environment

### .dockerignore

**Purpose**: Exclude files from Docker build context

**Excludes**:

- Development files
- Tests
- Documentation
- Git files
- Environment files

**When to Modify**:

- Adding new file types to exclude
- Optimizing build context size
- Including necessary files

### .env.example

**Purpose**: Template for environment configuration

**Sections**:

- Application config
- Database config
- Redis config
- API keys
- Feature flags

**When to Modify**:

- Adding new environment variables
- Documenting configuration options
- Updating defaults

## Scripts Explained

### scripts/validate.sh

**Purpose**: Pre-deployment validation

**Checks**:

- Docker installation
- Required files
- Environment configuration
- Security settings
- Resource availability

**Usage**:

```bash
./scripts/validate.sh              # Development check
./scripts/validate.sh --production # Production check
```

**Exit Codes**:

- `0`: All checks passed
- `1`: Errors found (blocking)

### scripts/quick-start.sh

**Purpose**: One-command setup for new users

**Actions**:

- Environment setup
- Secret generation
- Image building
- Service startup
- Health verification

**Usage**:

```bash
./scripts/quick-start.sh         # Start services
./scripts/quick-start.sh --open  # Start and open browser
```

## Makefile Commands

Quick reference for all Make commands:

### Development

```bash
make build          # Build Docker images
make up             # Start all services
make down           # Stop all services
make restart        # Restart services
make logs           # View all logs
make logs-api       # View API logs only
make shell          # Open shell in API container
make migrate        # Run database migrations
```

### Production

```bash
make prod-build     # Build production images
make prod-up        # Start production services
make prod-down      # Stop production services
make prod-scale     # Scale to 3 API instances
```

### Testing

```bash
make test           # Run tests
make test-watch     # Run tests in watch mode
make test-coverage  # Run with coverage
```

### Maintenance

```bash
make ps             # List containers
make clean          # Remove containers and volumes
make prune          # Remove all unused Docker resources
make health         # Check service health
```

## Environment Variables

### Required Variables

| Variable             | Description         | Example                   |
| -------------------- | ------------------- | ------------------------- |
| `NODE_ENV`           | Environment mode    | `production`              |
| `DATABASE_URL`       | Database connection | `libsql://...`            |
| `REDIS_URL`          | Redis connection    | `redis://redis:6379`      |
| `JWT_SECRET`         | JWT signing key     | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Refresh token key   | `openssl rand -base64 32` |

### Optional Variables

| Variable         | Description   | Default |
| ---------------- | ------------- | ------- |
| `PORT`           | API port      | `3000`  |
| `LOG_LEVEL`      | Logging level | `info`  |
| `CORS_ORIGIN`    | CORS origins  | `*`     |
| `RATE_LIMIT_MAX` | Rate limit    | `100`   |

Full list in [.env.example](.env.example)

## Common Tasks

### Starting Development Environment

```bash
# Option 1: Quick start script
cd docker/scripts
./quick-start.sh

# Option 2: Docker Compose
docker-compose -f docker/docker-compose.yml up

# Option 3: Makefile
cd docker
make up
```

### Deploying to Production

```bash
# 1. Validate
cd docker/scripts
./validate.sh --production

# 2. Build
docker build -f docker/Dockerfile.api -t bunship-api:1.0.0 .

# 3. Deploy
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d
```

### Running Tests

```bash
# Unit tests
docker-compose -f docker/docker-compose.test.yml up --abort-on-container-exit test

# Integration tests
docker-compose -f docker/docker-compose.test.yml up --abort-on-container-exit test-integration
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api

# Last 100 lines
docker-compose logs --tail=100 api
```

### Database Operations

```bash
# Run migrations
docker-compose exec api bun run db:migrate

# Seed database
docker-compose exec api bun run db:seed

# Open database studio
docker-compose exec api bun run db:studio
```

### Scaling Services

```bash
# Scale API to 3 instances
docker-compose up -d --scale api=3

# Scale worker to 2 instances
docker-compose up -d --scale worker=2
```

## Troubleshooting Guide

### Issue: Container won't start

**Check**:

1. `docker-compose logs api`
2. `docker-compose ps`
3. `docker inspect bunship-api`

**Common Causes**:

- Port already in use
- Missing environment variables
- Invalid configuration

### Issue: Port conflicts

**Solution**:

```bash
# Find process using port
lsof -i :3000

# Change port in docker-compose.yml
ports:
  - "3001:3000"
```

### Issue: Out of memory

**Solution**:

```bash
# Check resource usage
docker stats

# Increase limits in docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 2G
```

### Issue: Database connection failed

**Check**:

1. Database service is running
2. Connection string is correct
3. Network connectivity
4. Credentials are valid

**Debug**:

```bash
docker-compose exec api env | grep DATABASE
```

## Best Practices

### Development

1. Use docker-compose.override.yml for local customization
2. Keep source code mounted for hot reload
3. Use verbose logging
4. Don't commit .env file
5. Use development tools (Redis Commander, etc.)

### Production

1. Always run validation script before deployment
2. Use tagged images, not :latest
3. Set resource limits
4. Enable log rotation
5. Use secrets management (not .env)
6. Monitor resource usage
7. Keep backups current
8. Test rollback procedure

### Security

1. Never commit secrets to git
2. Use strong passwords/secrets
3. Run as non-root user
4. Keep base images updated
5. Scan images for vulnerabilities
6. Limit network exposure
7. Use HTTPS in production
8. Enable security headers

## Support Resources

### Documentation

- Main README: [README.md](README.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Deployment: [DEPLOYMENT.md](DEPLOYMENT.md)
- Checklist: [CHECKLIST.md](CHECKLIST.md)

### Scripts

- Validation: [scripts/validate.sh](scripts/validate.sh)
- Quick Start: [scripts/quick-start.sh](scripts/quick-start.sh)

### Configuration

- Dockerfile: [Dockerfile.api](Dockerfile.api)
- Dev Compose: [docker-compose.yml](docker-compose.yml)
- Prod Compose: [docker-compose.prod.yml](docker-compose.prod.yml)
- Test Compose: [docker-compose.test.yml](docker-compose.test.yml)

### Examples

- CI/CD: [.github-workflows-example.yml](.github-workflows-example.yml)
- Environment: [.env.example](.env.example)
- Override: [docker-compose.override.example.yml](docker-compose.override.example.yml)

## Version History

| Version | Date       | Changes         |
| ------- | ---------- | --------------- |
| 1.0.0   | 2026-01-28 | Initial release |

## Maintenance

### Regular Updates

**Weekly**:

- Check for security updates
- Review logs for errors
- Monitor resource usage

**Monthly**:

- Update base images
- Review and update documentation
- Test disaster recovery

**Quarterly**:

- Security audit
- Performance review
- Cost optimization

## Next Steps

1. **For New Users**: Start with [DOCKER-SUMMARY.md](DOCKER-SUMMARY.md)
2. **For Developers**: Run `./scripts/quick-start.sh`
3. **For DevOps**: Read [DEPLOYMENT.md](DEPLOYMENT.md)
4. **For Architects**: Review [ARCHITECTURE.md](ARCHITECTURE.md)

## Feedback

This documentation is maintained by the DevOps team. For issues, improvements, or questions:

- Open an issue in the repository
- Contact the DevOps team
- Update documentation via pull request

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-28
**Maintained By**: DevOps Team
