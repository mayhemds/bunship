# BunShip Docker Deployment Checklist

Use this checklist before deploying to production to ensure everything is properly configured.

## Pre-Deployment

### Environment Configuration

- [ ] `.env` file created from `.env.example`
- [ ] `NODE_ENV` set to `production`
- [ ] `API_URL` configured with production domain
- [ ] `FRONTEND_URL` configured with production domain
- [ ] `DATABASE_URL` pointing to production database
- [ ] `DATABASE_AUTH_TOKEN` set (if using Turso)
- [ ] `REDIS_URL` configured for production Redis
- [ ] `REDIS_PASSWORD` set with strong password
- [ ] `JWT_SECRET` generated with `openssl rand -base64 32`
- [ ] `JWT_REFRESH_SECRET` generated with `openssl rand -base64 32`
- [ ] Stripe keys changed from test to live keys
- [ ] Email service configured with production API key
- [ ] S3/Storage credentials configured
- [ ] OAuth credentials (Google, GitHub) configured
- [ ] All default/example values removed

### Security

- [ ] No secrets hardcoded in Dockerfile
- [ ] `.env` file added to `.gitignore`
- [ ] Secrets stored in vault (not in git)
- [ ] Image vulnerability scan passed
- [ ] Dependencies audit passed (`bun audit`)
- [ ] SSL/TLS certificates obtained
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting configured
- [ ] Security headers enabled (helmet)
- [ ] Database connection uses encryption
- [ ] Redis password authentication enabled

### Docker Configuration

- [ ] `Dockerfile.api` reviewed and optimized
- [ ] `docker-compose.prod.yml` configured
- [ ] Resource limits set (CPU, memory)
- [ ] Health checks configured for all services
- [ ] Restart policies set to `always`
- [ ] Log rotation configured
- [ ] Volumes configured for data persistence
- [ ] Networks properly isolated
- [ ] Port mappings correct
- [ ] No development mounts in production config

### Infrastructure

- [ ] Production server/cluster ready
- [ ] Docker and Docker Compose installed
- [ ] Server has sufficient resources (CPU, RAM, disk)
- [ ] Firewall rules configured
- [ ] Load balancer configured (if multi-instance)
- [ ] Domain DNS configured
- [ ] Reverse proxy configured (Caddy/Nginx/Traefik)
- [ ] SSL/TLS configured in reverse proxy
- [ ] CDN configured (if needed)
- [ ] Backup solution in place

### Database

- [ ] Production database created
- [ ] Database migrations reviewed
- [ ] Database backup strategy configured
- [ ] Connection pooling configured
- [ ] Database monitoring enabled
- [ ] Disaster recovery plan documented

### Monitoring & Logging

- [ ] Logging destination configured
- [ ] Log retention policy set
- [ ] Health check endpoints working
- [ ] Monitoring system configured (DataDog/Prometheus)
- [ ] Alerting rules configured
- [ ] Error tracking configured (Sentry)
- [ ] Uptime monitoring configured
- [ ] Dashboard created (Grafana)

### Testing

- [ ] Validation script passed (`./docker/scripts/validate.sh --production`)
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Load testing completed
- [ ] Security testing completed
- [ ] Staging deployment tested
- [ ] Rollback procedure tested
- [ ] Database migration tested on staging
- [ ] Backup/restore tested

### Documentation

- [ ] Deployment runbook created
- [ ] Architecture diagram updated
- [ ] Environment variables documented
- [ ] Incident response plan created
- [ ] Rollback procedure documented
- [ ] Team trained on deployment process
- [ ] Contact list updated (on-call rotation)

## Deployment Process

### Initial Deployment

- [ ] Create production environment file
- [ ] Build production Docker image
- [ ] Tag image with version number
- [ ] Push image to registry (if using)
- [ ] Run validation script
- [ ] Start database migration
- [ ] Verify migration successful
- [ ] Start services with production config
- [ ] Verify all containers started
- [ ] Run smoke tests
- [ ] Check health endpoints
- [ ] Monitor logs for errors
- [ ] Test critical user flows
- [ ] Update DNS if needed
- [ ] Monitor for 1 hour

### Commands Executed

```bash
# Build
docker build -f docker/Dockerfile.api -t bunship-api:1.0.0 .

# Validate
cd docker/scripts && ./validate.sh --production

# Migrate
docker run --rm --env-file .env.production bunship-api:1.0.0 bun run db:migrate

# Deploy
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d

# Verify
curl -f https://api.yourdomain.com/health
docker-compose ps
docker-compose logs --tail=100
```

### Post-Deployment

- [ ] All services running and healthy
- [ ] Health checks passing
- [ ] API responding to requests
- [ ] Database connections working
- [ ] Redis connections working
- [ ] Background jobs processing
- [ ] Email sending working
- [ ] File uploads working
- [ ] Authentication working
- [ ] Payment processing working (if applicable)
- [ ] Monitoring receiving data
- [ ] Logs being collected
- [ ] Backups running
- [ ] SSL certificate valid
- [ ] Performance acceptable
- [ ] Error rate acceptable

## Ongoing Maintenance

### Daily

- [ ] Check monitoring dashboards
- [ ] Review error logs
- [ ] Check system resources
- [ ] Verify backups completed

### Weekly

- [ ] Review performance metrics
- [ ] Check for security updates
- [ ] Review error trends
- [ ] Test critical user flows
- [ ] Verify backup restores

### Monthly

- [ ] Update dependencies
- [ ] Rebuild Docker images
- [ ] Review resource usage trends
- [ ] Update documentation
- [ ] Review and update secrets
- [ ] Security audit
- [ ] Load testing

### Quarterly

- [ ] Disaster recovery drill
- [ ] Performance review and optimization
- [ ] Security assessment
- [ ] Cost optimization review
- [ ] Documentation review

## Update Deployment Checklist

### Before Update

- [ ] Changelog reviewed
- [ ] Breaking changes identified
- [ ] Database migrations reviewed
- [ ] Rollback plan prepared
- [ ] Staging deployment successful
- [ ] Team notified of deployment window
- [ ] Maintenance mode prepared (if needed)

### During Update

- [ ] Backup current database
- [ ] Build new image with version tag
- [ ] Run migrations (if any)
- [ ] Deploy with zero-downtime strategy
- [ ] Monitor error rates
- [ ] Verify health checks passing

### After Update

- [ ] Smoke tests passed
- [ ] Critical flows working
- [ ] Error rate normal
- [ ] Performance acceptable
- [ ] Team notified of completion
- [ ] Documentation updated

## Rollback Checklist

### When to Rollback

- [ ] Critical functionality broken
- [ ] Error rate above threshold
- [ ] Performance degraded significantly
- [ ] Security vulnerability introduced
- [ ] Database corruption detected

### Rollback Steps

- [ ] Stop current version
- [ ] Restore previous image version
- [ ] Rollback database migrations (if safe)
- [ ] Start previous version
- [ ] Verify health checks
- [ ] Test critical flows
- [ ] Monitor error rates
- [ ] Notify team
- [ ] Document incident
- [ ] Plan fix for next deployment

## Emergency Procedures

### Service Down

1. [ ] Check container status: `docker-compose ps`
2. [ ] Check logs: `docker-compose logs --tail=100 api`
3. [ ] Check resources: `docker stats`
4. [ ] Restart service: `docker-compose restart api`
5. [ ] If persistent, rollback to previous version

### High Memory Usage

1. [ ] Identify container: `docker stats`
2. [ ] Check logs for memory leaks
3. [ ] Restart affected service
4. [ ] Scale horizontally if needed
5. [ ] Investigate and fix root cause

### Database Connection Issues

1. [ ] Verify database is running
2. [ ] Check connection string
3. [ ] Verify network connectivity
4. [ ] Check connection pool settings
5. [ ] Review database logs

### Redis Connection Issues

1. [ ] Check Redis container status
2. [ ] Verify Redis password
3. [ ] Check network connectivity
4. [ ] Restart Redis if needed
5. [ ] Clear cache if corrupted

## Contact Information

### On-Call Rotation

- Primary: [Name] - [Phone/Email]
- Secondary: [Name] - [Phone/Email]
- Escalation: [Name] - [Phone/Email]

### External Services

- Domain Registrar: [Contact Info]
- Hosting Provider: [Contact Info]
- Database Provider: [Contact Info]
- Email Service: [Contact Info]
- Payment Processor: [Contact Info]

## Sign-Off

### Pre-Deployment Review

- [ ] Reviewed by: **\*\*\*\***\_**\*\*\*\*** Date: **\_\_\_**
- [ ] Approved by: **\*\*\*\***\_**\*\*\*\*** Date: **\_\_\_**

### Post-Deployment Review

- [ ] Deployment successful: Yes / No
- [ ] Issues encountered: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- [ ] Completed by: **\*\*\*\***\_**\*\*\*\*** Date: **\_\_\_**
- [ ] Verified by: **\*\*\*\***\_**\*\*\*\*** Date: **\_\_\_**

## Notes

Use this section to document any deployment-specific notes, issues encountered, or lessons learned:

```
Deployment Date: _______
Version: _______
Notes:
-
-
-
```

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-28
**Next Review**: 2026-02-28
