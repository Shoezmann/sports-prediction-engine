# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace configuration
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Build the frontend
RUN npx nx build frontend --prod

# Stage 2: Runtime
FROM nginx:alpine AS runner

# Copy built output to nginx
COPY --from=builder /app/dist/apps/frontend/browser /usr/share/nginx/html

# Custom nginx config to handle SPA routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://backend:3000; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
