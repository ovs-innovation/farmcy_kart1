# syntax=docker/dockerfile:1

# ---------------------------------------------------------
# Stage 1: Install production dependencies
# ---------------------------------------------------------
FROM --platform=linux/amd64 node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install only production dependencies deterministically using the lockfile
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# ---------------------------------------------------------
# Stage 2: Production runner
# ---------------------------------------------------------
FROM --platform=linux/amd64 node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=5000

# Create non-root system group and user for secure runtime execution
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy production node_modules from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application source code with proper non-root ownership
COPY --chown=nodejs:nodejs . .

# Ensure writable directories exist with correct permissions for local uploads & static assets
RUN mkdir -p uploads/brand uploads/category uploads/product uploads/settings public/logo && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

CMD ["node", "api/index.js"]
