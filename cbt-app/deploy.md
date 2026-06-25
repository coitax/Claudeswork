---
name: deploy-cbt-cbet-brokenbeat
description: Deploy/redeploy the CBT tracker (this app) to cbet.brokenbeat.ca on the Linode. Node app (Fastify + Vite SPA) behind nginx reverse-proxy + systemd, not a static site.
---

# Deploy CBT tracker → cbet.brokenbeat.ca

Live: **https://cbet.brokenbeat.ca** (single-user CBT homework tracker).

## Server facts
- Host: Linode `192.46.222.16`, SSH alias **`art-critic`** (`root@`, key `~/.ssh/id_ed25519`).
- App checkout: `/var/www/cbet.brokenbeat.ca/app` (this repo), app dir `.../app/cbt-app`.
- Branch deployed: `claude/cbt-csv-export`.
- **Data (persistent, outside the checkout):** `/var/lib/cbt/data` — survives redeploys. Backups in `/var/backups/cbt/`.
- Runtime: Fastify on `127.0.0.1:5174` (serves the built SPA + API). nginx reverse-proxies the subdomain to it; TLS via Let's Encrypt.
- Service: systemd unit **`cbt`** (`/etc/systemd/system/cbt.service`), `ExecStart=/usr/bin/pnpm start` (`= NODE_ENV=production tsx src/server.ts`).
- Runtime env: `/var/www/cbet.brokenbeat.ca/app/cbt-app/.env` (chmod 600, NOT committed): `NODE_ENV, HOST=127.0.0.1, PORT=5174, DATA_DIR=/var/lib/cbt/data, SESSION_TTL_HOURS=168`.
- nginx block: `/etc/nginx/sites-available/cbet.brokenbeat.ca` (reverse-proxy → :5174). Cloudflare wildcard `*.brokenbeat.ca` → Linode, so no per-subdomain DNS step.

## Toolchain note
`pnpm` is provided by corepack (`/usr/bin/pnpm`, pinned 10.33.0 by `packageManager`). The **root `pnpm build` script is unusable** — `@cbt/api` has no build step (runs via `tsx`). Only the web bundle is built:

```bash
pnpm --filter @cbt/web build   # -> apps/web/dist (what the API serves)
```

## Redeploy (after pushing code)
```bash
ssh art-critic
cd /var/www/cbet.brokenbeat.ca/app && git pull
cd cbt-app && pnpm install && pnpm --filter @cbt/web build
systemctl restart cbt
systemctl is-active cbt
curl -sIL https://cbet.brokenbeat.ca/ | head -3   # expect 200
```
Data in `/var/lib/cbt/data` is untouched by redeploys.

## First-time setup (already done — for reference / rebuild)
```bash
# on server
corepack enable && corepack prepare pnpm@10.33.0 --activate
mkdir -p /var/lib/cbt/data /var/www/cbet.brokenbeat.ca
git clone https://github.com/coitax/Claudeswork.git /var/www/cbet.brokenbeat.ca/app
cd /var/www/cbet.brokenbeat.ca/app && git checkout claude/cbt-csv-export
cd cbt-app && pnpm install && pnpm --filter @cbt/web build
# .env (chmod 600) with NODE_ENV/HOST/PORT/DATA_DIR/SESSION_TTL_HOURS
# seed single user (see below), systemd unit `cbt`, nginx block, certbot --nginx -d cbet.brokenbeat.ca
```

## Login / rotate the password (secret stays on the server)
Initial credentials are in `/root/cbet-initial-credentials.txt` (chmod 600) — username `coi`, random temp password. To set your own password:
```bash
ssh art-critic
cd /var/www/cbet.brokenbeat.ca/app/cbt-app
CBT_USERNAME=coi CBT_PASSWORD='your-new-password' CBT_FORCE=1 DATA_DIR=/var/lib/cbt/data pnpm seed
systemctl restart cbt   # not strictly required; sessions are server-side
```
Never commit/rsync `.env` or print the password into chat/memory.

## CSV export → Google Sheets
In the app: **Settings ▸ Export** → three download buttons. Endpoints (behind login):
`GET /api/export/activity-weeks.csv`, `/api/export/thought-records.csv`, `/api/export/daily-moods.csv`.
In Google Sheets: **File ▸ Import ▸ Upload** each CSV into its own tab, then **Share**.

## Backups
`/usr/local/bin/cbt-backup.sh` copies `/var/lib/cbt/data` → `/var/backups/cbt/<date>/` daily at 03:30 (`/etc/cron.d/cbt-backup`), pruning >14 days.

## Verify
```bash
curl -sIL https://cbet.brokenbeat.ca/ | head -3        # 200, redirects http->https (301)
ssh art-critic 'systemctl status --no-pager cbt | head -5'
ssh art-critic 'journalctl -u cbt -n 30 --no-pager'    # logs if something is off
```

## Rollback
```bash
ssh art-critic 'systemctl stop cbt'                    # take the app down
# or revert nginx: rm /etc/nginx/sites-enabled/cbet.brokenbeat.ca && nginx -t && systemctl reload nginx
# restore data: cp -a /var/backups/cbt/<date>/data/* /var/lib/cbt/data/
```
Editing nginx, only touch the `cbet` block — leave brokenbeat root, `/stream`, and other subdomain blocks alone.
