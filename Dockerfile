# ============================================================
# Builder stage
# ============================================================
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ============================================================
# Runner stage
# ============================================================
FROM node:24-alpine AS runner

WORKDIR /app

# Copy built server
COPY --from=builder /app/output ./output

# Install only production deps from root package.json
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
RUN npm ci --omit=dev

# Create data directory (for volume mount if needed)
RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "output/server/index.mjs"]
