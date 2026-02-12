# BunShip Docker Configuration

Production-ready Docker setup for BunShip API with optimized multi-stage builds, security hardening, and orchestration via Docker Compose.

## Architecture

```
┌─────────────────────────────────────────┐
│           Load Balancer / CDN            │
└─────────────────┬───────────────────────┘
                  │
      ┌───────────┴──────────┐
      │                      │
┌─────▼─────┐          ┌────▼──────┐
│  API (x2) │          │   Redis   │
│  Port 3000│◄─────────┤  Queue    │
└─────┬─────┘          └────▲──────┘
      │                     │
      │               ┌─────┴──────┐
      │               │   Worker   │
      └───────────────┤ Background │
                      └────────────┘
```

## Quick Start

### Development

```bash
# Build and start all services
docker-compose -f docker/docker-compose.yml up --build

# Start in detached mode
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f api

# Stop all services
docker-compose -f docker/docker-compose.yml down
```

### Production

```bash
# Build production images
docker build -f docker/Dockerfile.api -t bunship-api:latest .

# Start with production config
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d

# Scale API instances
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d --scale api=3

# Stop and remove volumes (CAUTION: deletes data)
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml down -v
```

## Files

| File                      | Purpose                           |
| ------------------------- | --------------------------------- |
| `Dockerfile.api`          | Multi-stage build for API service |
| `docker-compose.yml`      | Development orchestration         |
| `docker-compose.prod.yml` | Production overrides              |
| `.dockerignore`           | Exclude files from build context  |

## Services

### API Service

**Ports:** 3000
**Health Check:** `GET /health`
**Environment:** See below

Main application service running the Elysia API. Uses Bun runtime for optimal performance.

### Redis Service

**Ports:** 6379
**Image:** redis:7-alpine
**Persistence:** Appendonly file (AOF)

Used for session storage, caching, and BullMQ job queues.

### Worker Service

**Environment:** Same as API
**Command:** `bun run apps/api/src/workers/index.ts`

Background job processor for async tasks like emails, webhooks, and scheduled jobs.

## Environment Variables

Create a `.env` file in the project root based on `.env.example`:

### Required

```bash
# Application
NODE_ENV=production
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Database
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-auth-token

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password

# JWT Secrets (min 32 characters)
JWT_SECRET=your-jwt-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
RESEND_API_KEY=re_xxx
EMAIL_FROM="YourApp <noreply@yourdomain.com>"
```

### Optional

```bash
# S3 Storage
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx
S3_REGION=us-east-1

# OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Monitoring
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

## Dockerfile Optimization

The multi-stage Dockerfile is optimized for:

### Layer Caching

- Dependencies installed before source code copy
- Production deps separate from dev deps
- Turborepo cache leveraged

### Security

- Runs as non-root user (`bunship:1001`)
- Alpine base for minimal attack surface
- Security updates applied
- No shell needed in runtime

### Size

- Multi-stage build discards dev dependencies
- Only dist files copied to final image
- Alpine base (~5MB vs 100MB+ for full Linux)

## Health Checks

All services include health checks:

```yaml
# API Health Check
GET http://localhost:3000/health

# Redis Health Check
redis-cli ping
```

Configure health endpoints in your API to return:

```json
{
  "status": "ok",
  "timestamp": "2026-01-28T10:00:00.000Z",
  "uptime": 12345,
  "version": "1.0.0"
}
```

## Resource Limits (Production)

| Service | CPU Limit | Memory Limit | Replicas |
| ------- | --------- | ------------ | -------- |
| API     | 1.0       | 1GB          | 2+       |
| Worker  | 1.0       | 1GB          | 1        |
| Redis   | 0.5       | 512MB        | 1        |

Adjust in `docker-compose.prod.yml` based on your load.

## Logging

Production logs are configured with rotation:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "50m"
    max-file: "5"
```

View logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api

# Last 100 lines
docker-compose logs --tail=100 api
```

## Database Migrations

Run migrations before starting:

```bash
# Development
docker-compose exec api bun run db:migrate

# Production (one-time init)
docker run --rm \
  --env-file .env \
  bunship-api:latest \
  bun run db:migrate
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Change port in docker-compose.yml
ports:
  - "3001:3000"  # host:container
```

### Container Won't Start

```bash
# Check logs
docker-compose logs api

# Check container status
docker ps -a

# Rebuild without cache
docker-compose build --no-cache api
```

### Database Connection Issues

```bash
# Check environment variables
docker-compose exec api env | grep DATABASE

# Test from container
docker-compose exec api bun run db:studio
```

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping

# Check auth
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} ping
```

## Performance Tuning

### Bun Optimizations

```dockerfile
# In Dockerfile, add build optimizations
RUN bun build src/index.ts \
    --outdir dist \
    --target bun \
    --minify \
    --sourcemap
```

### Redis Tuning

```yaml
# In docker-compose.prod.yml
command: redis-server \
  --appendonly yes \
  --maxmemory 512mb \
  --maxmemory-policy allkeys-lru \
  --tcp-backlog 511 \
  --timeout 0 \
  --tcp-keepalive 300
```

## Deployment

### Registry Push

```bash
# Tag image
docker tag bunship-api:latest registry.example.com/bunship-api:1.0.0

# Push to registry
docker push registry.example.com/bunship-api:1.0.0
```

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml bunship

# Scale services
docker service scale bunship_api=3
```

### Kubernetes

Convert to Kubernetes manifests using kompose:

```bash
kompose convert -f docker-compose.yml -f docker-compose.prod.yml
```

## Security Checklist

- [ ] Use secrets management (not .env in production)
- [ ] Enable TLS/SSL for Redis connections
- [ ] Run vulnerability scans on images
- [ ] Implement network policies
- [ ] Use read-only root filesystem where possible
- [ ] Enable Docker Content Trust
- [ ] Regularly update base images
- [ ] Scan images with Trivy/Snyk

## Support

For issues or questions:

- Check logs: `docker-compose logs`
- Review docs: `/docs`
- Open issue: GitHub Issues
