# syntax=docker/dockerfile:1

# ---------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install all dependencies (including devDependencies required for Vite build)
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------
# Stage 2: Build the static SPA application
# ---------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for Vite environment variables
ARG VITE_APP_API_BASE_URL
ARG VITE_APP_API_SOCKET_URL
ARG VITE_APP_STORE_DOMAIN
ARG VITE_APP_ADMIN_DOMAIN
ARG VITE_APP_CLOUD_NAME
ARG VITE_APP_CLOUDINARY_API_KEY
ARG VITE_APP_CLOUDINARY_UPLOAD_PRESET
ARG VITE_APP_CLOUDINARY_URL
ARG VITE_APP_CLOUDINARY_VIDEO_URL
ARG VITE_APP_MYMEMORY_API_KEY
ARG VITE_APP_ENCRYPT_PASSWORD
ARG VITE_APP_FIREBASE_API_KEY
ARG VITE_APP_FIREBASE_AUTH_DOMAIN
ARG VITE_APP_FIREBASE_PROJECT_ID
ARG VITE_APP_FIREBASE_STORAGE_BUCKET
ARG VITE_APP_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_APP_FIREBASE_APP_ID
ARG VITE_APP_FIREBASE_MEASUREMENT_ID
ARG VITE_APP_FIREBASE_VAPID_KEY
ARG VITE_APP_DISABLE_FOR_DEMO

ENV VITE_APP_API_BASE_URL=$VITE_APP_API_BASE_URL \
    VITE_APP_API_SOCKET_URL=$VITE_APP_API_SOCKET_URL \
    VITE_APP_STORE_DOMAIN=$VITE_APP_STORE_DOMAIN \
    VITE_APP_ADMIN_DOMAIN=$VITE_APP_ADMIN_DOMAIN \
    VITE_APP_CLOUD_NAME=$VITE_APP_CLOUD_NAME \
    VITE_APP_CLOUDINARY_API_KEY=$VITE_APP_CLOUDINARY_API_KEY \
    VITE_APP_CLOUDINARY_UPLOAD_PRESET=$VITE_APP_CLOUDINARY_UPLOAD_PRESET \
    VITE_APP_CLOUDINARY_URL=$VITE_APP_CLOUDINARY_URL \
    VITE_APP_CLOUDINARY_VIDEO_URL=$VITE_APP_CLOUDINARY_VIDEO_URL \
    VITE_APP_MYMEMORY_API_KEY=$VITE_APP_MYMEMORY_API_KEY \
    VITE_APP_ENCRYPT_PASSWORD=$VITE_APP_ENCRYPT_PASSWORD \
    VITE_APP_FIREBASE_API_KEY=$VITE_APP_FIREBASE_API_KEY \
    VITE_APP_FIREBASE_AUTH_DOMAIN=$VITE_APP_FIREBASE_AUTH_DOMAIN \
    VITE_APP_FIREBASE_PROJECT_ID=$VITE_APP_FIREBASE_PROJECT_ID \
    VITE_APP_FIREBASE_STORAGE_BUCKET=$VITE_APP_FIREBASE_STORAGE_BUCKET \
    VITE_APP_FIREBASE_MESSAGING_SENDER_ID=$VITE_APP_FIREBASE_MESSAGING_SENDER_ID \
    VITE_APP_FIREBASE_APP_ID=$VITE_APP_FIREBASE_APP_ID \
    VITE_APP_FIREBASE_MEASUREMENT_ID=$VITE_APP_FIREBASE_MEASUREMENT_ID \
    VITE_APP_FIREBASE_VAPID_KEY=$VITE_APP_FIREBASE_VAPID_KEY \
    VITE_APP_DISABLE_FOR_DEMO=$VITE_APP_DISABLE_FOR_DEMO \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

# ---------------------------------------------------------
# Stage 3: Production web server (Nginx Alpine)
# ---------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Configure Nginx for SPA fallback routing, gzip compression, and security headers
RUN cat <<'EOF' > /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html index.htm;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/javascript application/json application/xml application/rss+xml font/eot font/otf font/ttf image/svg+xml;
    gzip_disable "MSIE [1-6]\.";

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Static assets caching
    location ~* \.(?:css|js|woff2?|eot|ttf|otf|ico|png|jpe?g|gif|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # Health check endpoint
    location /healthz {
        access_log off;
        return 200 "healthy\n";
    }

    # SPA Fallback routing (React Router DOM v5)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

# Copy production static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Ensure proper non-root permissions for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
