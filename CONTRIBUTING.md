# Contributing to BunShip

Thank you for your interest in contributing to BunShip! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Please:

- Be respectful of differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.1.0 or later
- [Redis](https://redis.io) v7+
- Git

### Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/bunship.git
   cd bunship
   ```

3. **Add upstream remote**:

   ```bash
   git remote add upstream https://github.com/bunship/bunship.git
   ```

4. **Install dependencies**:

   ```bash
   bun install
   ```

5. **Set up environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Run database migrations**:

   ```bash
   bun run db:migrate
   ```

7. **Start development server**:
   ```bash
   bun dev
   ```

---

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

| Prefix      | Purpose           | Example                     |
| ----------- | ----------------- | --------------------------- |
| `feature/`  | New features      | `feature/add-slack-oauth`   |
| `fix/`      | Bug fixes         | `fix/auth-token-refresh`    |
| `docs/`     | Documentation     | `docs/update-setup-guide`   |
| `refactor/` | Code refactoring  | `refactor/auth-middleware`  |
| `test/`     | Adding tests      | `test/billing-service`      |
| `chore/`    | Maintenance tasks | `chore/update-dependencies` |

### Creating a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in small, focused commits
2. Write or update tests as needed
3. Ensure all tests pass: `bun test`
4. Check code style: `bun run lint`
5. Format code: `bun run format`

### Keeping Your Branch Updated

```bash
git fetch upstream
git rebase upstream/main
```

---

## Coding Standards

### TypeScript

- **Use strict mode** - No `any` types unless absolutely necessary
- **Explicit return types** - Define return types for functions
- **Use `const` assertions** - For configuration objects
- **Prefer interfaces** - Over type aliases for object shapes

```typescript
// Good
interface UserResponse {
  id: string;
  email: string;
  createdAt: Date;
}

async function getUser(id: string): Promise<UserResponse | null> {
  // ...
}

// Avoid
async function getUser(id: string): Promise<any> {
  // ...
}
```

### File Organization

```
src/
├── routes/          # API route handlers
├── middleware/      # Elysia middleware
├── services/        # Business logic
├── lib/             # Utilities and helpers
├── jobs/            # Background job definitions
└── types/           # TypeScript type definitions
```

### Naming Conventions

| Type             | Convention           | Example              |
| ---------------- | -------------------- | -------------------- |
| Files            | kebab-case           | `auth-middleware.ts` |
| Functions        | camelCase            | `verifyAccessToken`  |
| Classes          | PascalCase           | `AuthService`        |
| Constants        | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Types/Interfaces | PascalCase           | `UserResponse`       |

### Error Handling

Use the custom error classes from `@bunship/utils`:

```typescript
import { NotFoundError, ValidationError, AuthenticationError } from "@bunship/utils";

// Throw specific errors
if (!user) {
  throw new NotFoundError("User");
}

if (!isValidEmail(email)) {
  throw new ValidationError("Invalid email format");
}
```

### API Routes

Follow these patterns for route handlers:

```typescript
export const exampleRoutes = new Elysia({ prefix: "/examples" })
  .use(authMiddleware)

  // GET - List resources
  .get(
    "/",
    async ({ query }) => {
      const items = await exampleService.list(query);
      return { examples: items };
    },
    {
      query: t.Object({
        page: t.Optional(t.Number({ minimum: 1 })),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
      detail: {
        tags: ["Examples"],
        summary: "List all examples",
      },
    }
  )

  // POST - Create resource
  .post(
    "/",
    async ({ body, user }) => {
      const item = await exampleService.create(body, user.id);
      return { example: item };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
      }),
      detail: {
        tags: ["Examples"],
        summary: "Create an example",
      },
    }
  );
```

### Testing

Write tests for:

- All service methods
- API route handlers
- Middleware functions
- Utility functions

```typescript
// example.test.ts
import { describe, it, expect } from "bun:test";
import { exampleService } from "./example.service";

describe("ExampleService", () => {
  describe("create", () => {
    it("should create an example with valid data", async () => {
      const result = await exampleService.create({
        name: "Test Example",
      });

      expect(result).toBeDefined();
      expect(result.name).toBe("Test Example");
    });

    it("should throw ValidationError for empty name", async () => {
      await expect(exampleService.create({ name: "" })).rejects.toThrow(ValidationError);
    });
  });
});
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                               |
| ---------- | ----------------------------------------- |
| `feat`     | New feature                               |
| `fix`      | Bug fix                                   |
| `docs`     | Documentation only                        |
| `style`    | Code style (formatting, semicolons, etc.) |
| `refactor` | Code refactoring (no feature/fix)         |
| `perf`     | Performance improvement                   |
| `test`     | Adding or updating tests                  |
| `chore`    | Maintenance tasks                         |
| `ci`       | CI/CD changes                             |

### Examples

```bash
# Feature
feat(auth): add Twitter OAuth support

# Bug fix
fix(billing): handle subscription cancellation webhook

# Documentation
docs(readme): update quick start instructions

# With body
feat(webhooks): add retry mechanism

Implement exponential backoff for failed webhook deliveries.
Retries occur at 1m, 5m, 30m, 2h, and 24h intervals.

Closes #123
```

### Commit Best Practices

- Keep commits focused and atomic
- Write clear, descriptive messages
- Reference issues when applicable
- Separate refactoring from feature work

---

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest upstream changes
2. **Run all checks**:
   ```bash
   bun run typecheck
   bun run lint
   bun test
   ```
3. **Update documentation** if needed
4. **Update CHANGELOG.md** under `[Unreleased]`

### Submitting

1. **Push your branch**:

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a pull request** on GitHub

3. **Fill out the PR template** with:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (for UI changes)

### PR Title Format

Follow the same format as commit messages:

```
feat(auth): add Twitter OAuth support
fix(billing): handle subscription cancellation webhook
docs(readme): update quick start instructions
```

### Review Process

1. A maintainer will review your PR
2. Address any requested changes
3. Once approved, a maintainer will merge your PR

### After Merge

- Delete your feature branch
- Sync your fork with upstream

---

## Reporting Issues

### Bug Reports

When reporting bugs, include:

1. **Description** - Clear description of the bug
2. **Steps to reproduce** - Detailed steps to reproduce the issue
3. **Expected behavior** - What you expected to happen
4. **Actual behavior** - What actually happened
5. **Environment** - OS, Bun version, Redis version
6. **Logs** - Relevant error messages or logs

### Feature Requests

When requesting features, include:

1. **Problem** - What problem does this solve?
2. **Solution** - Your proposed solution
3. **Alternatives** - Other solutions you considered
4. **Context** - Any additional context

### Security Issues

**Do not report security vulnerabilities publicly.**

Email security@bunship.com with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## Questions?

- Open a [GitHub Discussion](https://github.com/bunship/bunship/discussions)
- Email [support@bunship.com](mailto:support@bunship.com)

Thank you for contributing to BunShip!
