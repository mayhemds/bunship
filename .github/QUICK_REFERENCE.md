# CI/CD Quick Reference

Essential commands and workflows for BunShip CI/CD.

## Local Development

```bash
# Install and build
make install && make build

# Development
make dev              # Start dev server
make test             # Run tests
make lint             # Run linter

# Pre-commit checks
make pre-commit       # Lint + format + typecheck
make pre-push         # All checks + tests
```

## CI Testing

```bash
# Test CI locally
make ci               # Full pipeline (15-20 min)

# Test in Docker
make docker-dev       # Start services
make ci-docker        # Run tests in container
make docker-down      # Stop services
```

## Pull Request Flow

```bash
# 1. Create branch
git checkout -b feature/awesome-feature

# 2. Make changes
# ... code ...

# 3. Pre-commit checks
make pre-commit

# 4. Commit
git add .
git commit -m "feat: add awesome feature"

# 5. Pre-push checks
make pre-push

# 6. Push and create PR
git push origin feature/awesome-feature
# CI runs automatically
```

## Release Flow

```bash
# 1. Ensure main is ready
git checkout main
git pull origin main

# 2. Create tag
git tag -a v1.0.0 -m "Release v1.0.0"

# 3. Push tag
git push origin v1.0.0

# 4. Release workflow runs
# - Builds Docker image
# - Pushes to ghcr.io
# - Creates GitHub release
# - Generates changelog

# 5. Pull image
docker pull ghcr.io/your-org/bunship:1.0.0
```

## Workflow Triggers

| Workflow | Trigger                  | Duration  |
| -------- | ------------------------ | --------- |
| CI       | Push to main/develop, PR | 15-20 min |
| Release  | Tag push (v*.*.\*)       | 15-18 min |
| CodeQL   | Push, PR, Weekly         | 10-15 min |
| Cleanup  | Weekly (Sunday)          | 10 min    |
| Validate | PR touching .github/     | 5 min     |

## Common Issues

### Lint Failures

```bash
make lint-fix
make format
```

### Test Failures

```bash
# Local
make test

# Docker
make ci-docker
```

### Build Failures

```bash
make clean
make install
make build
```

### Docker Build

```bash
docker build -t bunship-test .
docker run -p 3000:3000 bunship-test
```

### Tag Already Exists

```bash
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

## Makefile Commands

### Essential

```bash
make install          # Install deps
make dev              # Dev server
make build            # Build all
make test             # Run tests
make ci               # Full CI
```

### Code Quality

```bash
make lint             # Run linter
make lint-fix         # Fix issues
make format           # Format code
make typecheck        # Type check
```

### Database

```bash
make db-migrate       # Run migrations
make db-seed          # Seed data
make db-studio        # Open studio
```

### Docker

```bash
make docker-build     # Build image
make docker-dev       # Start CI env
make docker-down      # Stop services
```

## Monitoring

### Workflow Runs

- Go to **Actions** tab
- Click on workflow run
- Review job logs

### Security

- **Security** tab → Dependabot
- **Security** tab → Code scanning
- **Security** tab → Secret scanning

### Coverage

- Codecov dashboard (if configured)
- Coverage artifacts in workflow runs

## Required Secrets

| Secret              | Purpose               | Required |
| ------------------- | --------------------- | -------- |
| `GITHUB_TOKEN`      | Auto-provided         | Yes      |
| `CODECOV_TOKEN`     | Coverage reports      | Optional |
| `SLACK_WEBHOOK_URL` | Release notifications | Optional |

## Branch Protection

Recommended for `main`:

- ✓ Require PR reviews (1)
- ✓ Require status checks: lint, test, build
- ✓ Require up to date
- ✓ Require linear history

## Versioning

Use semantic versioning:

- **Patch** (v1.0.x) - Bug fixes
- **Minor** (v1.x.0) - New features
- **Major** (vx.0.0) - Breaking changes

Pre-releases:

- `v1.0.0-alpha.1`
- `v1.0.0-beta.1`
- `v1.0.0-rc.1`

## Commit Messages

Use conventional commits:

```
feat: add user authentication
fix: resolve memory leak
docs: update API documentation
chore: update dependencies
refactor: simplify error handling
test: add integration tests
```

## Docker Images

Pull latest:

```bash
docker pull ghcr.io/your-org/bunship:latest
```

Pull specific version:

```bash
docker pull ghcr.io/your-org/bunship:1.0.0
```

Run container:

```bash
docker run -p 3000:3000 \
  --env-file .env \
  ghcr.io/your-org/bunship:1.0.0
```

## Getting Help

1. Check `.github/CI_CD.md` for detailed docs
2. Review workflow logs
3. Check `CI_CD_SETUP.md` for setup guide
4. Open issue with bug report template

## Quick Links

- [GitHub Actions](https://docs.github.com/actions)
- [Bun Documentation](https://bun.sh/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
