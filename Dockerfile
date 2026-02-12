# Build stage
FROM oven/bun:1.1.0-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build all packages and the API
RUN bun run build

# Prune dev dependencies
RUN rm -rf node_modules && \
    bun install --production --frozen-lockfile

# Production stage
FROM oven/bun:1.1.0-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S bunship && \
    adduser -S bunship -u 1001

# Copy built application and production dependencies
COPY --from=builder --chown=bunship:bunship /app/node_modules ./node_modules
COPY --from=builder --chown=bunship:bunship /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=bunship:bunship /app/packages/*/dist ./packages/*/
COPY --from=builder --chown=bunship:bunship /app/package.json ./

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Switch to non-root user
USER bunship

# Expose the API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD bun run -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Start the application
CMD ["bun", "run", "apps/api/dist/index.js"]
