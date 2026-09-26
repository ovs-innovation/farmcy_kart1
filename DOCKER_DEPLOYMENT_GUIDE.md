# Farmacy Kart - Production Docker Deployment Guide (Hostinger VPS / Ubuntu 24.04)

This document provides the complete deployment audit, architecture blueprint, environment variable contracts, and step-by-step instructions for running Farmacy Kart on an **Ubuntu 24.04 Hostinger VPS** using **Docker Compose**.

---

## 1. Architecture Overview

Farmacy Kart consists of three core containerized services connected via an internal Docker bridge network (`farmacykart-network`) and reverse-proxied by the host VPS system Nginx:

```
                          ┌─────────────────────────────────────┐
                          │     Hostinger VPS (Ubuntu 24.04)    │
                          │        System Nginx (Port 443)      │
                          └──────────────────┬──────────────────┘
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             ▼                               ▼                               ▼
   https://farmacycart.com         https://api.farmacycart.com     https://admin.farmacycart.com
   (Storefront Next.js)            (Backend REST API)              (Admin SPA / Vite)
             │                               │                               │
             ▼ (Proxy Pass)                  ▼ (Proxy Pass)                  ▼ (Proxy Pass)
      Host Port 3000                  Host Port 5000                  Host Port 4100
             │                               │                               │
    ┌────────▼─────────┐            ┌────────▼─────────┐            ┌────────▼─────────┐
    │ Next.js Frontend │            │  Node.js Backend │            │   Nginx Admin    │
    │ Container (3000) │            │ Container (5000) │            │  Container (80)  │
    └──────────────────┘            └────────┬─────────┘            └──────────────────┘
                                             │ (Persistent Volumes)
                                    ┌────────▼─────────┐
                                    │ ./backend/uploads│
                                    │ ./backend/public │
                                    └──────────────────┘
```

---

## 2. Port & Service Matrix

| Service | Technology | Internal Container Port | Host Bound Port | Healthcheck Endpoint | Public Domain |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`backend`** | Node.js / Express | `5000` | `5000` | `http://127.0.0.1:5000/` | `https://api.farmacycart.com` |
| **`frontend`** | Next.js 14 Standalone | `3000` | `3000` | `http://127.0.0.1:3000/` | `https://farmacycart.com` |
| **`admin`** | Vite React SPA + Nginx | `80` | `4100` | `http://127.0.0.1:80/healthz` | `https://admin.farmacycart.com` |

---

## 3. Audit Findings & Required Corrections

### Critical Inconsistencies Resolved:
1. **Port Reconciliation**:
   - `backend/api/index.js` and `backend/Dockerfile` use port `5000`.
   - Initial Compose configuration had `5000:8092` with healthcheck on `8092`, causing healthchecks to fail and dependent services (`frontend`, `admin`) to be blocked.
   - **Fix**: Reconciled to canonical port `5000` for container listening, healthcheck, and port mappings.
2. **Docker Compose Build Context**:
   - Initial Compose configuration lacked `build:` definitions, preventing automated builds with `docker compose build`.
   - **Fix**: Added multi-stage build definitions with build arguments for all three services.
3. **Frontend & Admin Build-Time Inlining**:
   - Next.js (`NEXT_PUBLIC_*`) and Vite (`VITE_*`) require environment variables during the `npm run build` stage.
   - **Fix**: Configured `args:` blocks under `build:` in `docker-compose.yml` to pass all required public configuration parameters during image compilation.
4. **NextAuth Production Domain**:
   - Initial Compose file set `NEXTAUTH_URL=http://localhost:3000`.
   - **Fix**: Updated to `https://farmacycart.com`.
5. **Data Persistence (Uploads & Assets)**:
   - Backend uploads wholesaler documents and brand logos to `/app/uploads` and `/app/public/logo`.
   - **Fix**: Added Docker volume mounts (`./backend/uploads:/app/uploads` and `./backend/public/logo:/app/public/logo`) so uploaded files survive container rebuilds.

---

## 4. Environment Variables Contract

### A. Backend (`backend/.env`)
Create `backend/.env` on the VPS with the following structure:

```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# Database (MongoDB Atlas)
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/farmacykart?retryWrites=true&w=majority

# Authentication & Security
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
JWT_SECRET_FOR_VERIFY=your_verification_jwt_secret_key_here
ENCRYPT_PASSWORD=your_32_byte_aes_encryption_key_here

# Domain URLs (CORS & Redirects)
FRONTEND_URL=https://farmacycart.com
STORE_URL=https://farmacycart.com
ADMIN_URL=https://admin.farmacycart.com

# Email Provider (Resend or SMTP)
RESEND_API_KEY=re_your_resend_api_key_here
# Alternative SMTP:
# EMAIL_USER=notifications@farmacycart.com
# EMAIL_PASS=your_email_password
# SMTP_HOST=smtp.hostinger.com
# SMTP_PORT=587
# SMTP_SECURE=false

# SMS / OTP Provider (MSG91)
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_OTP_TEMPLATE_ID=your_msg91_otp_template_id
MSG91_SENDER_ID=FARMCY

# Payment Gateways (Optional / When Active)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Logistics (Shiprocket)
SHIPROCKET_EMAIL=your_shiprocket_email
SHIPROCKET_PASSWORD=your_shiprocket_password

# Cloudinary (Media Storage)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

---

### B. Frontend (`frontend/.env`)
Create `frontend/.env` on the VPS:

```bash
# API & Domain Configuration
NEXT_PUBLIC_API_BASE_URL=https://api.farmacycart.com/api
NEXT_PUBLIC_STORE_DOMAIN=https://farmacycart.com

# NextAuth Configuration
NEXTAUTH_URL=https://farmacycart.com
NEXTAUTH_SECRET=your_super_secret_nextauth_jwt_key

# Cloudinary (Client Uploads)
NEXT_PUBLIC_CLOUDINARY_URL=https://api.cloudinary.com/v1_1/<your_cloud_name>/image/upload
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Firebase (Web OTP & FCM Push Notifications)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

---

### C. Admin (`admin/.env`)
Create `admin/.env` on the VPS:

```bash
# API & Domain Configuration
VITE_APP_API_BASE_URL=https://api.farmacycart.com/api
VITE_APP_STORE_DOMAIN=https://farmacycart.com
VITE_APP_ADMIN_DOMAIN=https://admin.farmacycart.com

# Security & RBAC Encryption (Must match backend ENCRYPT_PASSWORD)
VITE_APP_ENCRYPT_PASSWORD=your_32_byte_aes_encryption_key_here

# Cloudinary
VITE_APP_CLOUD_NAME=your_cloudinary_cloud_name
VITE_APP_CLOUDINARY_API_KEY=your_cloudinary_api_key
VITE_APP_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
VITE_APP_CLOUDINARY_URL=https://api.cloudinary.com/v1_1/<your_cloud_name>/image/upload

# Firebase (Admin FCM)
VITE_APP_FIREBASE_API_KEY=your_firebase_api_key
VITE_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_APP_FIREBASE_PROJECT_ID=your_project_id
VITE_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_APP_FIREBASE_APP_ID=your_app_id
VITE_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_APP_FIREBASE_VAPID_KEY=your_vapid_key
```

---

## 5. Host Nginx Reverse Proxy Configuration

On the Ubuntu 24.04 VPS, configure Nginx virtual hosts in `/etc/nginx/sites-available/` with SSL certificates (e.g. Certbot / Let's Encrypt):

### 1. Storefront (`farmacycart.com` & `www.farmacycart.com`)
```nginx
server {
    server_name farmacycart.com www.farmacycart.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/farmacycart.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/farmacycart.com/privkey.pem;
}
```

### 2. Backend API (`api.farmacycart.com`)
```nginx
server {
    server_name api.farmacycart.com;
    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/api.farmacycart.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.farmacycart.com/privkey.pem;
}
```

### 3. Admin Panel (`admin.farmacycart.com`)
```nginx
server {
    server_name admin.farmacycart.com;

    location / {
        proxy_pass http://127.0.0.1:4100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/admin.farmacycart.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.farmacycart.com/privkey.pem;
}
```

---

## 6. Deployment Commands

Execute the following commands on the VPS:

### 1. Validate Docker Compose Configuration
```bash
docker compose config
```

### 2. Build Container Images
```bash
docker compose build --no-cache
```

### 3. Start All Services in Background
```bash
docker compose up -d
```

### 4. Check Health & Running Containers
```bash
docker compose ps
```

### 5. Inspect Service Logs
```bash
# All services
docker compose logs -f

# Specific services
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f admin
```

### 6. Restart or Stop Services
```bash
# Restart all
docker compose restart

# Stop all containers (preserves volumes)
docker compose down
```

---

## 7. Safety & PM2 Coexistence Guidelines

1. **Do not stop or delete PM2 processes** during testing. The Docker containers bind to local ports `3000`, `5000`, and `4100`.
2. **Do not touch `/var/www/farmcy_kart`** or existing system configuration.
3. Verify all endpoints via `curl` locally before switching DNS or Nginx upstream proxies:
   ```bash
   curl -I http://127.0.0.1:5000/
   curl -I http://127.0.0.1:3000/
   curl -I http://127.0.0.1:4100/healthz
   ```
