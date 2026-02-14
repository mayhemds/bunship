# BunShip Deployment Guide

Comprehensive deployment strategies for BunShip using Docker across various platforms.

## Table of Contents

- [Pre-deployment Checklist](#pre-deployment-checklist)
- [Environment Setup](#environment-setup)
- [Deployment Options](#deployment-options)
  - [Docker Compose](#docker-compose)
  - [Docker Swarm](#docker-swarm)
  - [Kubernetes](#kubernetes)
  - [Cloud Platforms](#cloud-platforms)
- [Security Hardening](#security-hardening)
- [Monitoring](#monitoring)
- [Rollback Procedures](#rollback-procedures)

## Pre-deployment Checklist

Before deploying to production:

- [ ] **Environment Variables**: All secrets set in secure vault
- [ ] **Database Migrations**: Tested and ready to run
- [ ] **SSL/TLS Certificates**: Valid and configured
- [ ] **Domain/DNS**: Configured and propagated
- [ ] **Monitoring**: Alerts and dashboards set up
- [ ] **Backups**: Automated backup strategy in place
- [ ] **Load Testing**: Performance validated under expected load
- [ ] **Security Scan**: Images scanned for vulnerabilities
- [ ] **Documentation**: Runbooks and incident response plans ready
- [ ] **Rollback Plan**: Tested rollback procedure

## Environment Setup

### 1. Generate Secrets

```bash
# JWT secrets
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # JWT_REFRESH_SECRET

# Redis password
openssl rand -base64 24  # REDIS_PASSWORD

# Cron secret
openssl rand -hex 16     # CRON_SECRET
```

### 2. Configure Environment

Copy production environment template:

```bash
cp docker/.env.example .env.production
```

Edit `.env.production` with production values:

```bash
# CRITICAL: Never commit this file
NODE_ENV=production
API_URL=https://api.yourdomain.com
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-turso-token
REDIS_PASSWORD=generated-redis-password
JWT_SECRET=generated-jwt-secret
# ... etc
```

### 3. Validate Configuration

```bash
# Check all required env vars are set
docker run --rm --env-file .env.production alpine env | grep -E "DATABASE_URL|JWT_SECRET|REDIS"
```

## Deployment Options

### Docker Compose

Best for: Single-server deployments, VPS hosting

#### Initial Deployment

```bash
# 1. Build production image
docker build -f docker/Dockerfile.api -t bunship-api:1.0.0 .

# 2. Run database migrations
docker run --rm \
  --env-file .env.production \
  bunship-api:1.0.0 \
  bun run db:migrate

# 3. Start services
docker-compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  up -d

# 4. Verify health
curl -f https://api.yourdomain.com/health
```

#### Updates

```bash
# Zero-downtime update
docker-compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  up -d --no-deps --build api

# Rollback if needed
docker-compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  up -d --no-deps api:1.0.0
```

### Docker Swarm

Best for: Multi-server deployments with orchestration

#### Initialize Swarm

```bash
# On manager node
docker swarm init --advertise-addr <MANAGER-IP>

# On worker nodes
docker swarm join --token <TOKEN> <MANAGER-IP>:2377
```

#### Deploy Stack

```bash
# Create overlay network
docker network create --driver overlay bunship-network

# Deploy secrets
echo "your-jwt-secret" | docker secret create jwt_secret -
echo "your-redis-password" | docker secret create redis_password -

# Create stack config
cat > docker-stack.yml <<EOF
version: '3.9'
services:
  api:
    image: bunship-api:1.0.0
    secrets:
      - jwt_secret
      - redis_password
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      rollback_config:
        parallelism: 1
      placement:
        constraints:
          - node.role == worker
    networks:
      - bunship-network

secrets:
  jwt_secret:
    external: true
  redis_password:
    external: true
EOF

# Deploy
docker stack deploy -c docker-stack.yml bunship
```

#### Manage Stack

```bash
# List services
docker stack services bunship

# Scale API
docker service scale bunship_api=5

# View logs
docker service logs -f bunship_api

# Update image
docker service update --image bunship-api:1.1.0 bunship_api

# Rollback
docker service rollback bunship_api
```

### Kubernetes

Best for: Large-scale, cloud-native deployments

#### Convert Compose to K8s

```bash
# Install kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.31.0/kompose-linux-amd64 -o kompose
chmod +x kompose

# Convert
./kompose convert -f docker/docker-compose.yml -f docker/docker-compose.prod.yml
```

#### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace bunship

# Create secrets
kubectl create secret generic bunship-secrets \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=redis-password=your-redis-password \
  -n bunship

# Apply manifests
kubectl apply -f k8s/ -n bunship

# Check status
kubectl get pods -n bunship
kubectl get services -n bunship

# Scale
kubectl scale deployment bunship-api --replicas=5 -n bunship
```

### Cloud Platforms

#### AWS (ECS)

```bash
# 1. Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag bunship-api:latest <account>.dkr.ecr.us-east-1.amazonaws.com/bunship-api:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/bunship-api:latest

# 2. Create ECS task definition (task-definition.json)
# 3. Create ECS service
aws ecs create-service \
  --cluster bunship-cluster \
  --service-name bunship-api \
  --task-definition bunship-api:1 \
  --desired-count 2 \
  --load-balancer targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=api,containerPort=3000
```

#### Google Cloud Run

```bash
# 1. Build and push
gcloud builds submit --tag gcr.io/PROJECT-ID/bunship-api

# 2. Deploy
gcloud run deploy bunship-api \
  --image gcr.io/PROJECT-ID/bunship-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets JWT_SECRET=jwt-secret:latest
```

#### DigitalOcean App Platform

```bash
# Using doctl CLI
doctl apps create --spec .do/app.yaml

# Or via web console: App Platform > Create App
# Point to GitHub repo, select docker/Dockerfile.api
```

#### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

## Security Hardening

### Image Scanning

```bash
# Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image bunship-api:latest

# Snyk
snyk container test bunship-api:latest
```

### Network Security

```bash
# Restrict Redis to internal network only
# In docker-compose.prod.yml, remove 'ports' from redis service

# Use Docker secrets instead of env vars
docker secret create db_url - < db_url.txt
```

### Content Security

```bash
# Enable read-only root filesystem
# Add to docker-compose.prod.yml:
services:
  api:
    read_only: true
    tmpfs:
      - /tmp
```

### TLS Configuration

```bash
# Use Caddy or Traefik as reverse proxy with automatic HTTPS
docker run -d \
  -p 80:80 -p 443:443 \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  caddy:latest
```

## Monitoring

### Logs

```bash
# Send to centralized logging
# Add to docker-compose.prod.yml:
logging:
  driver: "syslog"
  options:
    syslog-address: "tcp://logs.example.com:514"
    tag: "bunship-api"
```

### Metrics

```bash
# Prometheus metrics endpoint
# Add to API health endpoint
GET /metrics

# Grafana dashboard
docker run -d -p 3001:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana
```

### Alerts

```bash
# Docker healthcheck failure alert
# In docker-compose.prod.yml:
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 3s
  retries: 3
  start_period: 40s
```

## Rollback Procedures

### Docker Compose

```bash
# 1. Stop current version
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml stop api

# 2. Rollback to previous image
docker tag bunship-api:1.0.0 bunship-api:latest

# 3. Start previous version
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d api

# 4. Rollback database if needed
docker-compose exec api bun run db:rollback
```

### Docker Swarm

```bash
# Automatic rollback on failure
docker service update \
  --rollback \
  bunship_api
```

### Kubernetes

```bash
# Rollback deployment
kubectl rollout undo deployment/bunship-api -n bunship

# Rollback to specific revision
kubectl rollout undo deployment/bunship-api --to-revision=2 -n bunship
```

## Performance Optimization

### Resource Limits

```yaml
# docker-compose.prod.yml
deploy:
  resources:
    limits:
      cpus: "2.0"
      memory: 2G
    reservations:
      cpus: "1.0"
      memory: 1G
```

### Caching

```bash
# Use BuildKit cache
DOCKER_BUILDKIT=1 docker build \
  --cache-from bunship-api:latest \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -f docker/Dockerfile.api \
  -t bunship-api:latest .
```

### Multi-region

```bash
# Deploy to multiple regions with load balancer
# Region 1: US-East
# Region 2: EU-West
# Region 3: Asia-Pacific
# Use GeoDNS to route traffic to nearest region
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs bunship-api

# Inspect container
docker inspect bunship-api

# Check resource usage
docker stats
```

### High Memory Usage

```bash
# Monitor memory
docker stats --no-stream

# Limit memory
docker update --memory 512m bunship-api
```

### Slow Performance

```bash
# Check database connections
docker exec bunship-api bun run db:status

# Check Redis
docker exec bunship-redis redis-cli INFO stats
```

## Support

For deployment assistance:

- Documentation: `/docs`
- Issues: GitHub Issues
- Monitoring: Check Grafana dashboards
- Logs: Centralized logging system
