# CI/CD Documentation

This document describes the CI/CD pipelines configured for BunShip.

## Workflows Overview

### 1. CI Pipeline (`ci.yml`)

Runs on every push to `main`/`develop` and all pull requests.

**Jobs:**

- **Lint & Type Check**
  - Runs ESLint/Biome linting
  - Checks code formatting with Prettier
  - Performs TypeScript type checking
  - Duration: ~2-3 minutes

- **Test**
  - Runs unit tests
  - Runs integration tests with Redis and PostgreSQL
  - Uploads coverage reports to Codecov
  - Duration: ~5-8 minutes

- **Build**
  - Builds all packages in the monorepo
  - Builds Docker image (without pushing)
  - Uploads build artifacts
  - Duration: ~3-5 minutes

- **Security Scan**
  - Runs `bun audit` for dependency vulnerabilities
  - Runs Trivy filesystem scanner
  - Uploads results to GitHub Security
  - Duration: ~2-3 minutes

**Required Secrets:**

- `CODECOV_TOKEN` (optional, for coverage reports)

### 2. Release Pipeline (`release.yml`)

Triggers on tag pushes (e.g., `v1.0.0`).

**Jobs:**

- **Build and Push**
  - Builds production Docker image
  - Pushes to GitHub Container Registry (ghcr.io)
  - Multi-architecture support (amd64, arm64)
  - Duration: ~10-15 minutes

- **Create Release**
  - Generates changelog from git commits
  - Creates GitHub release with notes
  - Links to Docker image
  - Duration: ~1-2 minutes

- **Notify**
  - Sends Slack notification (if configured)
  - Duration: ~30 seconds

**Required Secrets:**

- `GITHUB_TOKEN` (automatically provided)
- `SLACK_WEBHOOK_URL` (optional, for notifications)

### 3. CodeQL Security Scan (`codeql.yml`)

Runs on pushes, PRs, and weekly schedule.

**Jobs:**

- **Analyze Code**
  - Runs CodeQL analysis for JavaScript/TypeScript
  - Performs security and quality checks
  - Uploads results to GitHub Security tab
  - Duration: ~10-15 minutes

- **Dependency Review**
  - Reviews new dependencies in PRs
  - Fails on high-severity issues
  - Blocks GPL/AGPL licenses
  - Duration: ~1-2 minutes

- **Secret Scanning**
  - Scans for accidentally committed secrets
  - Uses TruffleHog OSS
  - Duration: ~2-3 minutes

### 4. PR Labeling (`label-pr.yml`)

Automatically labels PRs based on:

- Modified files (api, database, docs, etc.)
- PR size (xs, s, m, l, xl)

### 5. Cleanup (`cleanup.yml`)

Runs weekly to clean up:

- Build artifacts older than 30 days
- Cache entries older than 7 days
- Container images older than 30 days (keeps 5 most recent)

### 6. Stale Management (`stale.yml`)

Automatically manages stale issues and PRs:

- Issues: marked stale after 60 days, closed after 7 days
- PRs: marked stale after 30 days, closed after 14 days

## Required Configuration

### GitHub Secrets

Set these in repository settings under `Settings → Secrets and variables → Actions`:

**Required:**

- None (uses `GITHUB_TOKEN` by default)

**Optional:**

- `CODECOV_TOKEN` - For code coverage tracking
- `SLACK_WEBHOOK_URL` - For release notifications

### GitHub Permissions

Ensure the following permissions are enabled:

- Actions: Read/Write
- Packages: Write
- Security Events: Write
- Pull Requests: Write

### Branch Protection Rules

Recommended settings for `main` branch:

```
☑ Require pull request reviews (1 approval)
☑ Require status checks to pass before merging
  - lint
  - test
  - build
☑ Require branches to be up to date
☑ Require linear history
☑ Include administrators
```

## Dependabot Configuration

Located in `.github/dependabot.yml`:

- Updates npm dependencies weekly
- Updates GitHub Actions weekly
- Updates Docker base images weekly
- Groups minor and patch updates
- Auto-labels PRs as "dependencies"

## Using the CI/CD Pipelines

### For Developers

**Creating a PR:**

1. Push your branch
2. Open a PR to `main` or `develop`
3. CI pipeline runs automatically
4. All checks must pass before merging
5. PR is automatically labeled based on changes

**Before Merging:**

- Ensure all CI checks pass (✓)
- Get required approvals
- Resolve merge conflicts
- Check security scan results

### For Maintainers

**Creating a Release:**

1. Ensure `main` branch is ready
2. Create and push a tag:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```
3. Release pipeline runs automatically
4. Docker image pushed to ghcr.io
5. GitHub release created with changelog

**Pulling Release Image:**

```bash
docker pull ghcr.io/your-org/bunship:1.0.0
```

**Pre-release Tags:**

- `v1.0.0-alpha.1` - marked as pre-release
- `v1.0.0-beta.1` - marked as pre-release
- `v1.0.0-rc.1` - marked as pre-release

## Caching Strategy

The CI pipeline uses GitHub Actions cache for:

1. **Bun Dependencies**
   - Cache key: OS + `bun.lockb` hash
   - Restores from: OS + bun
   - Significantly speeds up dependency installation

2. **Docker Layers**
   - Uses GitHub Actions cache
   - Mode: max (aggressive caching)
   - Speeds up Docker builds by ~5x

## Troubleshooting

### CI Pipeline Failures

**Lint Failures:**

```bash
# Fix automatically
bun run lint:fix
bun run format
```

**Test Failures:**

```bash
# Run tests locally
bun run test

# Run specific test
bun test path/to/test.test.ts
```

**Build Failures:**

```bash
# Clear cache and rebuild
bun run clean
bun install
bun run build
```

### Docker Build Failures

**Check Docker build locally:**

```bash
docker build -f Dockerfile -t bunship-api:test .
```

**Test multi-stage build:**

```bash
docker build --target builder -t bunship-builder .
docker build --target runner -t bunship-runner .
```

### Release Failures

**Tag already exists:**

```bash
# Delete local and remote tag
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# Create new tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

## Best Practices

### Commit Messages

Follow conventional commits for automatic changelog generation:

```
feat: add user authentication
fix: resolve memory leak in cache
docs: update API documentation
chore: update dependencies
refactor: simplify error handling
test: add integration tests for payments
```

### PR Workflow

1. Create feature branch from `develop`
2. Make changes and commit frequently
3. Keep PRs focused and small
4. Update tests and documentation
5. Run CI checks locally before pushing
6. Respond to review feedback promptly

### Release Workflow

1. Merge all features to `develop`
2. Test thoroughly in staging
3. Merge `develop` to `main`
4. Tag release from `main`
5. Monitor release pipeline
6. Verify Docker image
7. Update deployment documentation

## Monitoring and Alerts

### GitHub Actions Logs

View workflow runs:

- Go to `Actions` tab
- Click on workflow run
- Review job logs and artifacts

### Security Alerts

Monitor security issues:

- Go to `Security` tab
- Check Dependabot alerts
- Review CodeQL findings
- Check secret scanning alerts

### Coverage Reports

Track code coverage:

- Codecov dashboard (if configured)
- Coverage artifacts in CI runs
- Trend over time in PRs

## Advanced Configuration

### Custom Workflows

Create custom workflows in `.github/workflows/`:

```yaml
name: Custom Workflow
on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Deployment environment"
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Your deployment steps
```

### Matrix Builds

Test across multiple versions:

```yaml
strategy:
  matrix:
    bun-version: [1.0.0, 1.1.0]
    os: [ubuntu-latest, macos-latest]
```

### Reusable Workflows

Share workflows across repos:

```yaml
jobs:
  call-workflow:
    uses: your-org/workflows/.github/workflows/reusable.yml@main
    with:
      config: production
```

## Resources

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Bun Documentation](https://bun.sh/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Semantic Versioning](https://semver.org/)
