# ============================================
# VOICORY BACKEND - GOOGLE CLOUD RUN DOCKERFILE
# Optimized multi-stage build for production
# ============================================

FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev for any build steps)
RUN npm ci --only=production

# ============================================
# PRODUCTION IMAGE
# ============================================
FROM node:20-alpine AS production

# Add labels for Cloud Run
LABEL maintainer="Voicory <team@voicory.com>"
LABEL org.opencontainers.image.source="https://github.com/esspron/Callyy"

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Remove unnecessary files
RUN rm -rf .env .env.* .git .gitignore nixpacks.toml railway.json

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run uses port 8080 by default
EXPOSE 8080

# Switch to non-root user
USER nodejs

# Health check (Cloud Run handles this, but good for local testing)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "index.js"]
