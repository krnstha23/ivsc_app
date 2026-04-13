# Production Server Setup Guide

This guide walks through setting up the IVCS (ScoreMirror) app on a fresh Linux server using Docker.

## Prerequisites

- A Linux VPS (Ubuntu 22.04/24.04 LTS recommended)
- Minimum specs: 1-2 vCPUs, 2 GB RAM, 20 GB disk
- A domain name pointed at the server's IP (e.g. `app.yourdomain.com`)
- SSH access to the server

## 1. Server Hardening

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Create a non-root user (skip if your provider already created one)
adduser deploy
usermod -aG sudo deploy

# Disable root SSH login and password auth
# Edit /etc/ssh/sshd_config and set:
#   PermitRootLogin no
#   PasswordAuthentication no
sudo systemctl restart sshd

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

> Do NOT expose port 5432 (PostgreSQL) or 3000 (app) — only 80/443 through the reverse proxy.

## 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

Verify Docker starts on boot:

```bash
sudo systemctl is-enabled docker
# If not enabled:
sudo systemctl enable docker
```

## 3. Add Swap Space

Required for servers with 2 GB RAM or less. The Next.js build is memory-intensive.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Verify:

```bash
free -h
# Should show a Swap line with 2G
```

## 4. Clone the Repository

```bash
git clone <your-repo-url> ~/ivcs-app
cd ~/ivcs-app
```

If prompted about GitHub's SSH key authenticity, verify the fingerprint matches [GitHub's published fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints), then type `yes`.

To skip the prompt in future (e.g. for CI):

```bash
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
```

## 5. Configure Environment Variables

Create the `.env` file in the project root:

```bash
cd ~/ivcs-app

echo "AUTH_SECRET=\"$(openssl rand -base64 32)\"" > .env
echo 'AUTH_URL="https://app.yourdomain.com"' >> .env
```

Verify:

```bash
cat .env
```

You should see two lines: `AUTH_SECRET` with a random string and `AUTH_URL` with your domain.

### Change the default database password

Edit `docker-compose.yml` and replace `ivcs_secret` with a strong password in **all four** places:

- `db` service → `POSTGRES_PASSWORD`
- `app` service → `DATABASE_URL`
- `migrate` service → `DATABASE_URL`
- `seed` service → `DATABASE_URL`

### Remove external Postgres port

In `docker-compose.yml`, remove the `ports` block from the `db` service so PostgreSQL is only reachable from within Docker's network:

```yaml
# REMOVE these two lines from the db service:
    ports:
      - "5432:5432"
```

## 6. Build and Start

Build one service at a time to avoid OOM on low-memory servers:

```bash
docker compose build app
```

Run database migrations:

```bash
docker compose run --rm migrate
```

Start the app and database:

```bash
docker compose up -d
```

Verify everything is running:

```bash
docker compose ps
docker compose logs app --tail 50
```

The app is now running on `http://localhost:3000` inside the server.

## 7. Seed the Database (First Deploy Only)

```bash
docker compose run --rm seed
```

> The seed creates users with password `password123`. Change all passwords immediately.

## 8. Set Up Reverse Proxy with SSL

### Option A: Caddy (recommended — automatic HTTPS)

```bash
sudo apt install -y caddy
```

Edit `/etc/caddy/Caddyfile`:

```
app.yourdomain.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl restart caddy
```

Caddy automatically provisions and renews Let's Encrypt certificates.

### Option B: Nginx + Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/ivcs`:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and get SSL:

```bash
sudo ln -s /etc/nginx/sites-available/ivcs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d app.yourdomain.com
```

## 9. Set Up Database Backups

```bash
mkdir -p ~/backups
crontab -e
```

Add a daily backup at 3 AM:

```
0 3 * * * docker compose -f ~/ivcs-app/docker-compose.yml exec -T db pg_dump -U ivcs ivcs_db | gzip > ~/backups/ivcs_$(date +\%Y\%m\%d).sql.gz
```

To restore a backup:

```bash
gunzip -c ~/backups/ivcs_20260413.sql.gz | docker compose exec -T db psql -U ivcs ivcs_db
```

Optionally sync backups off-server with `rsync` or `rclone` to S3/B2.

## 10. Deploying Updates

```bash
cd ~/ivcs-app
git pull
docker compose build app
docker compose run --rm migrate
docker compose up -d
```

## Troubleshooting

### Build killed (OOM)

If `docker compose build` is killed with `signal: SIGKILL`:

1. Ensure swap is enabled: `free -h`
2. Build one service at a time: `docker compose build app`
3. If still failing, increase swap to 4G or upgrade VPS RAM

### Check what's using memory

```bash
# Top memory consumers
ps aux --sort=-%mem | head -20

# Docker-specific usage
docker stats --no-stream
```

### Check OOM kill logs

```bash
sudo dmesg | grep -i "oom\|killed" | tail -10
```

### Containers not starting after reboot

```bash
sudo systemctl enable docker
docker compose up -d
```

### View application logs

```bash
docker compose logs app --tail 100 -f
```

### Re-run migrations

```bash
docker compose run --rm migrate
```

## Architecture Overview

```
Internet
   │
   ▼
[Caddy/Nginx]  ──  HTTPS termination (port 443)
   │
   ▼
[App Container]  ──  Next.js standalone (port 3000)
   │
   ▼
[DB Container]   ──  PostgreSQL 17 (internal network only)
   │
   ▼
[pgdata volume]  ──  Persistent database storage
```

- The app and database communicate over Docker's internal network.
- PostgreSQL is not exposed to the host or internet.
- Both containers auto-restart unless explicitly stopped.
- Database data persists in the `pgdata` Docker volume.
