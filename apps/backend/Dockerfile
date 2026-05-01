# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy workspace configuration
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Build the backend
RUN npx nx build backend --prod

# Stage 2: Runtime
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy only the built output and production dependencies
COPY --from=builder /app/dist/apps/backend ./
COPY --from=builder /app/node_modules ./node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

EXPOSE 3000

CMD ["node", "main.js"]
