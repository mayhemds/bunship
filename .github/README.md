# GitHub Configuration

This directory contains all GitHub-specific configurations for BunShip, including CI/CD workflows, issue templates, and automation rules.

## Quick Start

### Running CI Locally

```bash
# Run full CI pipeline
make ci

# Run individual checks
make lint
make typecheck
make test
make build

# Test in Docker environment (simulates CI)
make ci-docker
```

### Creating a Pull Request

1. Create a feature branch
2. Make your changes
3. Run pre-commit checks: `make pre-commit`
4. Push and create PR
5. CI will automatically run and label your PR

### Creating a Release

```bash
# Create and push a tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Release workflow will:
# - Build Docker image
# - Push to ghcr.io
# - Create GitHub release
# - Generate changelog
```

## Directory Structure

```
.github/
├── actions/
│   └── setup-bun/           # Reusable Bun setup action
├── workflows/
│   ├── ci.yml               # Main CI pipeline
│   ├── release.yml          # Release automation
│   ├── codeql.yml           # Security scanning
│   ├── label-pr.yml         # Auto-label PRs
│   ├── cleanup.yml          # Cleanup old artifacts
│   └── stale.yml            # Stale issue management
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml       # Bug report template
│   ├── feature_request.yml  # Feature request template
│   └── config.yml           # Issue template config
├── PULL_REQUEST_TEMPLATE.md # PR template
├── dependabot.yml           # Dependabot config
├── labeler.yml              # PR auto-labeling rules
├── docker-compose.ci.yml    # Local CI testing
├── CI_CD.md                 # Detailed CI/CD docs
└── README.md                # This file
```

## Workflows

### CI Pipeline (`ci.yml`)

**Triggers:** Push to main/develop, Pull Requests

**Jobs:**

- Lint & Type Check (2-3 min)
- Test (5-8 min)
- Build (3-5 min)
- Security Scan (2-3 min)

**Total Duration:** ~10-15 minutes

### Release Pipeline (`release.yml`)

**Triggers:** Tag push (v*.*.\*)

**Jobs:**

- Build and Push Docker Image (10-15 min)
- Create GitHub Release (1-2 min)
- Notify via Slack (optional)

**Outputs:**

- Docker image: `ghcr.io/your-org/bunship:version`
- GitHub release with changelog
- Slack notification (if configured)

### CodeQL Security (`codeql.yml`)

**Triggers:** Push, PR, Weekly schedule

**Jobs:**

- Code analysis with CodeQL
- Dependency review on PRs
- Secret scanning with TruffleHog

**Results:** Posted to GitHub Security tab

### PR Labeling (`label-pr.yml`)

Automatically labels PRs based on:

- Files changed (api, database, docs, etc.)
- PR size (xs, s, m, l, xl)

### Cleanup (`cleanup.yml`)

**Schedule:** Weekly (Sunday 00:00 UTC)

Cleans up:

- Artifacts > 30 days old
- Caches > 7 days old
- Images > 30 days old (keeps 5 most recent)

### Stale Management (`stale.yml`)

**Schedule:** Daily

- Issues: Stale after 60 days, closed after 7 days
- PRs: Stale after 30 days, closed after 14 days

## Required Secrets

Set in `Settings → Secrets and variables → Actions`:

**Optional:**

- `CODECOV_TOKEN` - Code coverage tracking
- `SLACK_WEBHOOK_URL` - Release notifications

**Auto-provided:**

- `GITHUB_TOKEN` - Automatically available

## Dependabot

Automated dependency updates:

- **npm packages** - Weekly on Monday 09:00 UTC
- **GitHub Actions** - Weekly on Monday 09:00 UTC
- **Docker images** - Weekly on Monday 09:00 UTC

Updates are grouped:

- Minor/patch updates together
- Development dependencies separate
- Major updates ignored by default

## Issue Templates

Two templates available:

1. **Bug Report** - For reporting bugs
2. **Feature Request** - For suggesting features

Templates use YAML format for structured input.

## PR Template

Comprehensive checklist covering:

- Code quality
- Documentation
- Testing
- Security
- Performance
- Deployment considerations

## Custom Actions

### Setup Bun Action

Reusable action at `.github/actions/setup-bun/`:

```yaml
- uses: ./.github/actions/setup-bun
  with:
    bun-version: "1.1.0"
    install-deps: "true"
    frozen-lockfile: "true"
```

**Features:**

- Installs Bun with specified version
- Caches dependencies intelligently
- Outputs cache hit status
- Optionally installs dependencies

## Local CI Testing

### Using Docker Compose

```bash
# Start test environment
docker compose -f .github/docker-compose.ci.yml up

# Run tests in CI environment
docker compose -f .github/docker-compose.ci.yml run test-runner

# Stop services
docker compose -f .github/docker-compose.ci.yml down
```

### Using Make

```bash
# Full CI pipeline
make ci

# Individual steps
make lint
make typecheck
make test
make build

# Pre-commit/push hooks
make pre-commit
make pre-push
```

## Branch Protection

Recommended settings for `main`:

```
☑ Require pull request reviews (1 approval)
☑ Require status checks before merging:
  - lint
  - test
  - build
☑ Require branches to be up to date
☑ Require linear history
☑ Include administrators
```

## Monitoring

### Workflow Runs

Go to `Actions` tab to view all workflow runs

### Security Alerts

Go to `Security` tab for:

- Dependabot alerts
- CodeQL findings
- Secret scanning results

### Code Coverage

View in Codecov dashboard (if configured)

## Best Practices

### Commit Messages

Use conventional commits:

```
feat: add user authentication
fix: resolve memory leak
docs: update API docs
chore: update dependencies
refactor: simplify error handling
test: add integration tests
```

### PR Size

Keep PRs focused and small:

- XS: < 10 lines
- S: < 100 lines
- M: < 500 lines
- L: < 1000 lines
- XL: > 1000 lines (consider splitting)

### Release Cadence

- **Patch** (v1.0.x) - Bug fixes, weekly
- **Minor** (v1.x.0) - New features, bi-weekly
- **Major** (vx.0.0) - Breaking changes, quarterly

## Troubleshooting

### CI Failures

**Lint errors:**

```bash
make lint-fix
make format
```

**Test failures:**

```bash
# Run locally
make test

# Run in Docker
make ci-docker
```

**Build failures:**

```bash
make clean
make install
make build
```

### Cache Issues

If cache causes problems:

1. Go to Actions → Caches
2. Delete relevant caches
3. Re-run workflow

### Release Issues

**Tag already exists:**

```bash
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

## Resources

- [Detailed CI/CD Documentation](CI_CD.md)
- [GitHub Actions Docs](https://docs.github.com/actions)
- [Bun Documentation](https://bun.sh/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## Support

For questions or issues with CI/CD:

1. Check [CI_CD.md](CI_CD.md) for detailed docs
2. Review workflow logs in Actions tab
3. Open an issue using the bug report template
4. Reach out in discussions

---

**Note:** Update `your-org` and `your-username` placeholders in:

- `dependabot.yml`
- `.github/ISSUE_TEMPLATE/config.yml`
- Workflow files (for organization-specific configurations)
