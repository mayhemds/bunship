## Description

<!-- Provide a brief description of the changes in this PR -->

## Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring (no functional changes)
- [ ] CI/CD changes
- [ ] Dependency updates

## Related Issues

<!-- Link to related issues using #issue_number -->

Closes #

## Changes Made

<!-- List the main changes made in this PR -->

-
-
-

## Testing

<!-- Describe the tests you ran and how to reproduce them -->

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

### How to Test

1.
2.
3.

## Screenshots (if applicable)

<!-- Add screenshots to help explain your changes -->

## Checklist

### Code Quality

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Code is properly commented, particularly in complex areas
- [ ] No console.log or debugging code left in
- [ ] No commented-out code blocks

### Documentation

- [ ] Documentation updated (README, API docs, etc.)
- [ ] CHANGELOG.md updated (if applicable)
- [ ] JSDoc/TSDoc comments added for new functions/classes
- [ ] Environment variables documented in .env.example

### Testing & Quality

- [ ] All existing tests pass locally
- [ ] New tests added for new functionality
- [ ] Test coverage maintained or improved
- [ ] Linter passes (`bun run lint`)
- [ ] Type check passes (`bun run typecheck`)
- [ ] Build succeeds (`bun run build`)

### Security & Performance

- [ ] No sensitive data exposed (API keys, passwords, tokens)
- [ ] Input validation added where necessary
- [ ] SQL injection prevention considered
- [ ] XSS prevention considered
- [ ] Performance impact considered and acceptable
- [ ] Database migrations are reversible (if applicable)

### Dependencies

- [ ] Dependencies necessary and properly vetted
- [ ] No unnecessary dependencies added
- [ ] Lockfile updated (`bun.lockb`)

### Database Changes (if applicable)

- [ ] Database migrations created
- [ ] Migrations tested on local database
- [ ] Rollback procedure documented
- [ ] Database seeds updated (if needed)

### API Changes (if applicable)

- [ ] API documentation updated
- [ ] Backward compatibility maintained or breaking changes documented
- [ ] Eden types regenerated (`bun run eden:generate`)
- [ ] Request/response validation added
- [ ] Rate limiting considered

### Deployment Considerations

- [ ] Environment variables documented
- [ ] Feature flags used for risky changes
- [ ] Deployment steps documented (if special steps required)
- [ ] Rollback plan considered

## Additional Notes

<!-- Add any additional notes, concerns, or context for reviewers -->

## Reviewer Checklist

<!-- For reviewers to complete -->

- [ ] Code logic is sound and efficient
- [ ] Security implications reviewed
- [ ] Performance impact is acceptable
- [ ] Tests are comprehensive
- [ ] Documentation is clear and complete
- [ ] No merge conflicts
- [ ] CI/CD pipeline passes

---

By submitting this PR, I confirm that my contribution is made under the terms of the project's license.
