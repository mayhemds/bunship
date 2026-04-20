# Git Hooks

Optional Git hooks to catch issues before pushing to CI.

## Installation

### Automatic (Recommended)

Add to `package.json`:

```json
{
  "scripts": {
    "prepare": "cp .github/hooks/* .git/hooks/ && chmod +x .git/hooks/*"
  }
}
```

Then run:

```bash
bun install
```

### Manual

```bash
# Install pre-commit hook
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Install pre-push hook
cp .github/hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

## Hooks

### pre-commit

Runs on every commit:

- Code formatting check
- Linting
- Type checking

**Duration:** ~30 seconds

If formatting issues are found, they are automatically fixed and you'll need to commit again.

### pre-push

Runs before pushing:

- Code formatting check
- Linting
- Type checking
- Tests
- Build

**Duration:** ~2-5 minutes

This replicates the full CI pipeline locally, catching issues before they reach GitHub.

## Bypassing Hooks

If you need to bypass hooks temporarily:

```bash
# Skip pre-commit
git commit --no-verify -m "message"

# Skip pre-push
git push --no-verify
```

**Warning:** Only bypass hooks if absolutely necessary. CI will catch these issues later.

## Troubleshooting

### Hook not running

Check if executable:

```bash
ls -la .git/hooks/pre-commit
ls -la .git/hooks/pre-push
```

Make executable:

```bash
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push
```

### Hook fails

Run the checks manually:

```bash
# Pre-commit checks
make pre-commit

# Pre-push checks
make pre-push
```

### Uninstall hooks

```bash
rm .git/hooks/pre-commit
rm .git/hooks/pre-push
```

## Alternative: Using Husky

If you prefer Husky for Git hooks:

```bash
# Install Husky
bun add -D husky

# Initialize
bunx husky init

# Add pre-commit hook
echo "make pre-commit" > .husky/pre-commit

# Add pre-push hook
echo "make pre-push" > .husky/pre-push
```

## CI Alignment

These hooks run the same checks as CI:

- Pre-commit → Lint job
- Pre-push → Full CI pipeline

This ensures local checks match CI, reducing push-fix cycles.

## Performance

### Speeding Up Hooks

1. **Skip tests on pre-commit:**
   - Only run lint and typecheck
   - Leave full tests for pre-push

2. **Use watch mode during development:**

   ```bash
   bun test --watch
   ```

3. **Run CI in background:**
   ```bash
   make ci &
   ```

## Best Practices

1. **Install hooks immediately** after cloning
2. **Never bypass** unless absolutely necessary
3. **Fix issues locally** rather than in CI
4. **Keep hooks fast** (< 1 min for pre-commit)
5. **Match CI checks** exactly
