# BunShip Docker Architecture

Visual representation of the Docker infrastructure and deployment architecture.

## Container Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Host                               │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              bunship-network (bridge)                       │ │
│  │                                                              │ │
│  │  ┌──────────────┐      ┌──────────────┐                   │ │
│  │  │  API (x2)    │      │  Worker (x1) │                   │ │
│  │  │              │      │              │                   │ │
│  │  │ Port: 3000   │◄─────┤ Background   │                   │ │
│  │  │ Bun Runtime  │      │ Jobs         │                   │ │
│  │  │ Health: ✓    │      │              │                   │ │
│  │  └──────┬───────┘      └──────┬───────┘                   │ │
│  │         │                     │                            │ │
│  │         └─────────┬───────────┘                            │ │
│  │                   ▼                                         │ │
│  │         ┌─────────────────┐                                │ │
│  │         │  Redis (x1)     │                                │ │
│  │         │                 │                                │ │
│  │         │  Port: 6379     │                                │ │
│  │         │  Cache + Queue  │                                │ │
│  │         │  Health: ✓      │                                │ │
│  │         └─────────────────┘                                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     Volumes                                 │ │
│  │                                                              │ │
│  │  redis-data     │  Persistent Redis data (AOF)             │ │
│  │  db-data        │  SQLite database files                   │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Multi-Stage Build Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Dockerfile Stages                         │
└─────────────────────────────────────────────────────────────┘

┌───────────────┐
│  FROM base    │  oven/bun:1.1.38-alpine
│  ─────────    │  • Install system dependencies
│  Stage 1      │  • Install dumb-init
└───────┬───────┘  • Set up working directory
        │
        ├─────────────────────────────────┐
        │                                 │
┌───────▼───────┐                ┌───────▼───────┐
│  FROM base    │                │  FROM base    │
│  AS deps      │                │  AS builder   │
│  ─────────    │                │  ─────────    │
│  Stage 2      │                │  Stage 3      │
│               │                │               │
│ • Copy        │                │ • Copy        │
│   package.json│                │   package.json│
│ • Install     │                │ • Install ALL │
│   prod deps   │                │   deps        │
│   only        │                │ • Copy source │
│               │                │ • Run build   │
└───────────────┘                └───────┬───────┘
                                         │
                                 ┌───────▼───────┐
                                 │  FROM base    │
                                 │  AS runner    │
                                 │  ─────────    │
                                 │  Stage 4      │
                                 │               │
                                 │ • Copy deps   │
                                 │   from stage 2│
                                 │ • Copy built  │
                                 │   from stage 3│
                                 │ • Non-root    │
                                 │   user        │
                                 │ • Expose 3000 │
                                 │ • Health check│
                                 └───────────────┘
                                         │
                                         ▼
                                 ┌───────────────┐
                                 │ Final Image   │
                                 │ ~150MB        │
                                 └───────────────┘
```

## Request Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     ▼
┌─────────────────┐
│ Reverse Proxy   │  Caddy/Nginx/Traefik
│ (Not included)  │  • SSL/TLS Termination
└────┬────────────┘  • Load Balancing
     │              • Rate Limiting
     ▼
┌─────────────────┐
│  API Container  │  Port 3000
│  ───────────    │
│  Elysia Server  │
│                 │
│  Routes:        │
│  /health        │──► Health Check
│  /api/*         │──► API Endpoints
│  /auth/*        │──► Authentication
│  /swagger       │──► API Documentation
└────┬────────────┘
     │
     ├──────────────────┐
     │                  │
     ▼                  ▼
┌──────────┐      ┌──────────┐
│  Redis   │      │ Database │
│  Cache   │      │ (Turso)  │
└──────────┘      └──────────┘
     │
     ▼
┌──────────────────┐
│ Worker Container │
│  ───────────     │
│  BullMQ Worker   │
│                  │
│  Jobs:           │
│  • Emails        │
│  • Webhooks      │
│  • Scheduled     │
└──────────────────┘
```

## Development vs Production

### Development Configuration

```
┌─────────────────────────────────────────────────┐
│           Development Environment                │
└─────────────────────────────────────────────────┘

• Source code mounted (hot reload)
• Debug ports exposed (9229)
• Verbose logging
• Development tools included:
  - Redis Commander
  - MinIO (local S3)
  - Mailhog (email testing)
• No resource limits
• Single replica
```

### Production Configuration

```
┌─────────────────────────────────────────────────┐
│           Production Environment                 │
└─────────────────────────────────────────────────┘

• Compiled code only (no source)
• No debug ports
• Structured logging
• No development tools
• Resource limits enforced
• Multiple replicas (2+)
• Restart: always
• Health checks: strict
• Log rotation: enabled
```

## Scaling Strategy

### Horizontal Scaling

```
                    ┌──────────────┐
                    │ Load Balancer│
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼────┐    ┌─────▼────┐    ┌─────▼────┐
    │  API 1   │    │  API 2   │    │  API 3   │
    │ (Primary)│    │(Secondary│    │(Secondary│
    └─────┬────┘    └─────┬────┘    └─────┬────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                    ┌─────▼─────┐
                    │   Redis   │
                    │ (Shared)  │
                    └───────────┘
```

### Deployment Strategy

```
┌────────────────────────────────────────────────┐
│        Zero-Downtime Deployment                 │
└────────────────────────────────────────────────┘

Step 1: Current State
┌──────┐  ┌──────┐
│ V1.0 │  │ V1.0 │  (2 instances)
└──────┘  └──────┘

Step 2: Scale Up
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│ V1.0 │  │ V1.0 │  │ V1.1 │  │ V1.1 │  (4 instances)
└──────┘  └──────┘  └──────┘  └──────┘

Step 3: Health Check
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│ V1.0 │  │ V1.0 │  │ V1.1✓│  │ V1.1✓│  (verify new)
└──────┘  └──────┘  └──────┘  └──────┘

Step 4: Remove Old
                     ┌──────┐  ┌──────┐
                     │ V1.1 │  │ V1.1 │  (2 instances)
                     └──────┘  └──────┘
```

## Network Architecture

```
┌─────────────────────────────────────────────────┐
│              External Network                    │
└──────────────────┬──────────────────────────────┘
                   │
           ┌───────▼────────┐
           │  Port 80/443   │  (HTTPS)
           │  Reverse Proxy │
           └───────┬────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│          bunship-network (bridge)                │
│                                                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ api:3000 │    │worker:N/A│    │redis:6379│  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘  │
│       │               │               │         │
│       └───────────────┴───────────────┘         │
│                                                   │
│  Internal DNS:                                   │
│  • redis        → 172.x.x.x                     │
│  • api          → 172.x.x.x                     │
│  • worker       → 172.x.x.x                     │
└─────────────────────────────────────────────────┘
```

## Data Flow

### Write Operation

```
Client
  │
  └─► API Container
        │
        ├─► Redis (cache invalidation)
        │
        ├─► Database (write)
        │
        └─► Queue Job (async tasks)
              │
              └─► Worker Container
                    │
                    ├─► Send Email
                    ├─► Update Search Index
                    └─► Trigger Webhooks
```

### Read Operation

```
Client
  │
  └─► API Container
        │
        ├─► Redis (check cache)
        │     │
        │     ├─► Cache Hit → Return
        │     │
        │     └─► Cache Miss
        │           │
        └───────────┴─► Database (query)
                          │
                          └─► Redis (set cache)
                                │
                                └─► Return to Client
```

## Security Layers

```
┌────────────────────────────────────────────────┐
│              Security Layers                    │
└────────────────────────────────────────────────┘

Layer 1: Network
├─ Firewall rules
├─ VPN/Private network
└─ DDoS protection

Layer 2: Reverse Proxy
├─ SSL/TLS termination
├─ Rate limiting
├─ Request filtering
└─ Security headers

Layer 3: Container
├─ Non-root user
├─ Read-only filesystem
├─ Resource limits
└─ Security scanning

Layer 4: Application
├─ Input validation
├─ Authentication
├─ Authorization
└─ CORS policy

Layer 5: Data
├─ Encryption at rest
├─ Encryption in transit
├─ Secret management
└─ Backup encryption
```

## Monitoring Architecture

```
┌────────────────────────────────────────────────┐
│           Monitoring Stack                      │
└────────────────────────────────────────────────┘

Docker Containers
  │
  ├─► Metrics (Prometheus)
  │     │
  │     └─► Grafana (Visualization)
  │
  ├─► Logs (Docker logs)
  │     │
  │     └─► Centralized Logging
  │           (ELK/Loki)
  │
  ├─► Health Checks
  │     │
  │     └─► Uptime Monitoring
  │
  └─► Errors (Sentry)
        │
        └─► Alerting (PagerDuty/Slack)
```

## Backup Strategy

```
┌────────────────────────────────────────────────┐
│            Backup Architecture                  │
└────────────────────────────────────────────────┘

┌──────────────┐
│   Database   │
└──────┬───────┘
       │
       ├─► Daily Snapshot
       │     │
       │     └─► S3 / Cloud Storage
       │           (30 day retention)
       │
       └─► Point-in-Time Recovery
             │
             └─► Transaction Logs
                   (7 day retention)

┌──────────────┐
│ Docker Volume│
└──────┬───────┘
       │
       └─► Weekly Backup
             │
             └─► tar.gz Archive
                   (90 day retention)
```

## Disaster Recovery

```
┌────────────────────────────────────────────────┐
│         Disaster Recovery Flow                  │
└────────────────────────────────────────────────┘

Incident Detected
       │
       ▼
┌─────────────┐
│   Assess    │  • Severity
│             │  • Impact
└─────┬───────┘  • Cause
      │
      ├─► Minor Issue
      │     │
      │     └─► Rolling Restart
      │
      ├─► Major Issue
      │     │
      │     └─► Rollback to Previous Version
      │
      └─► Critical Issue
            │
            ├─► Switch to Backup Region
            │
            └─► Restore from Backup
                  │
                  └─► Verify Data Integrity
                        │
                        └─► Resume Operations
```

## Resource Allocation

### Recommended Resources

```
┌──────────────────────────────────────────────┐
│           Resource Allocation                 │
└──────────────────────────────────────────────┘

Single Server (Small)
├─ CPU: 2 cores
├─ RAM: 4 GB
├─ Disk: 50 GB SSD
└─ Services:
    ├─ API: 1 GB RAM, 1 CPU
    ├─ Worker: 512 MB RAM, 0.5 CPU
    └─ Redis: 512 MB RAM, 0.5 CPU

Multi-Server (Production)
├─ CPU: 4-8 cores per node
├─ RAM: 16-32 GB per node
├─ Disk: 100-500 GB SSD
└─ Services:
    ├─ API: 3 instances, 2 GB each
    ├─ Worker: 2 instances, 1 GB each
    └─ Redis: Managed service
```

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-28
**Maintained By**: DevOps Team
