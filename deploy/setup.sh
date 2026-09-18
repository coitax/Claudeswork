#!/usr/bin/env bash
# One-command deploy for Spanish Quest on a Debian/Ubuntu server (e.g. Linode).
#
#   sudo bash setup.sh you@example.com
#
# The email is used for the Let's Encrypt certificate (expiry notices).
# Omit it to register the cert without an email.
#
# What it does (idempotent — safe to re-run):
#   1. Installs nginx, git, certbot
#   2. Clones (or updates) the game into /var/www/learn.brokenbeat.ca
#   3. Installs the nginx site and obtains an HTTPS certificate
#      (HTTPS is required for the voice/microphone features)
#   4. Adds a cron job that pulls from GitHub every 5 minutes, so merges
#      to main go live automatically
set -euo pipefail

DOMAIN="learn.brokenbeat.ca"
REPO="https://github.com/coitax/Claudeswork.git"
WEBROOT="/var/www/${DOMAIN}"
EMAIL="${1:-}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo: sudo bash setup.sh you@example.com" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx git certbot python3-certbot-nginx

# Clone or update the game
if [ -d "${WEBROOT}/.git" ]; then
  git -C "${WEBROOT}" pull --ff-only
else
  mkdir -p "$(dirname "${WEBROOT}")"
  git clone "${REPO}" "${WEBROOT}"
fi

# Nginx site
cp "${WEBROOT}/deploy/nginx.conf" "/etc/nginx/sites-available/${DOMAIN}"
ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Open the firewall if ufw is active
if command -v ufw >/dev/null 2>&1; then
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
fi

# HTTPS via Let's Encrypt (needs the DNS A record for ${DOMAIN} pointing here)
if [ -n "${EMAIL}" ]; then
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect
else
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email --redirect
fi

# Auto-deploy: pull from GitHub every 5 minutes
cat > /etc/cron.d/spanish-quest-deploy <<CRON
*/5 * * * * root git -C ${WEBROOT} pull --ff-only >/dev/null 2>&1
CRON

echo
echo "=========================================================="
echo "  Spanish Quest is live at https://${DOMAIN}"
echo "  Merges to main auto-deploy within 5 minutes."
echo "=========================================================="
