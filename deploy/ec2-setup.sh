#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# EC2 Setup Script for LinkedIn Profile Analyzer
# Run on a fresh Ubuntu 22.04 instance
# Usage: sudo bash ec2-setup.sh <REPO_URL> <DOMAIN>
# ──────────────────────────────────────────────

REPO_URL="${1:?Usage: sudo bash ec2-setup.sh <REPO_URL> <DOMAIN>}"
DOMAIN="${2:?Usage: sudo bash ec2-setup.sh <REPO_URL> <DOMAIN>}"
APP_DIR="/opt/linkedin-analyzer"

echo ">>> Updating system packages..."
apt-get update && apt-get upgrade -y

# ── Install Docker ───────────────────────────
echo ">>> Installing Docker..."
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker

# ── Install Nginx & Certbot ──────────────────
echo ">>> Installing Nginx and Certbot..."
apt-get install -y nginx certbot python3-certbot-nginx

# ── Clone repository ─────────────────────────
echo ">>> Cloning repository..."
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

# ── Configure environment ────────────────────
echo ">>> Setting up environment file..."
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "IMPORTANT: Edit $APP_DIR/backend/.env and set your OPENAI_API_KEY"
fi

# ── Configure Nginx ──────────────────────────
echo ">>> Configuring Nginx..."
sed "s/your-domain.com/$DOMAIN/g" nginx/default.conf > /etc/nginx/sites-available/default
nginx -t
systemctl restart nginx

# ── Start application ────────────────────────
echo ">>> Starting application with Docker Compose..."
docker compose up -d --build

# ── SSL setup ────────────────────────────────
echo ">>> Setting up SSL with Let's Encrypt..."
echo "Run the following command to obtain an SSL certificate:"
echo "  sudo certbot --nginx -d $DOMAIN"
echo ""
echo "After certbot succeeds, uncomment the HTTPS block in"
echo "  /etc/nginx/sites-available/default"
echo "and restart Nginx:"
echo "  sudo systemctl restart nginx"

echo ""
echo "=== Setup complete ==="
echo "App running at: http://$DOMAIN"
echo "Health check:   curl http://$DOMAIN/health"
echo "Edit .env at:   $APP_DIR/backend/.env"
