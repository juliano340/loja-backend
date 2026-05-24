# Backend Deploy

## Environments

- Local backend: `D:\sandbox\loja\backend`
- Production frontend: `https://loja.juliano340.com`
- Production backend: `https://api-loja.juliano340.com`
- Runtime: PM2
- Node entrypoint: `dist/main.js`
- Database: PostgreSQL
- ORM: TypeORM

## Critical Rules

- Do not run `npm install` on the VPS.
- Do not build on the VPS.
- Build locally and upload the generated `dist` directory.
- Always back up the app directory and database before deploy.
- Never commit `.env`, `.env.production`, `.env.local`, or real PM2 config files.
- Keep `TYPEORM_MIGRATIONS_RUN=false` in production by default.
- Run migrations manually only when required and only after a backup.

## Environment Variables

Use `.env.example` as the safe reference. Production values must stay private on the VPS.

Required variables:

- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `TYPEORM_MIGRATIONS_RUN`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CHECKOUT_SUCCESS_URL`
- `CHECKOUT_CANCEL_URL`
- `CURRENCY`
- `PENDING_ORDER_TTL_MINUTES`

## Pre-Deploy Checklist

Run locally from `backend`:

```bash
npm test
npm run build
git status
```

Before upload, confirm:

- Tests pass.
- Build passes.
- Only intended files changed.
- No real secrets are staged.
- VPS app backup is complete.
- VPS database backup is complete.

## VPS Backup

Adjust paths and credentials to match the real server.

```bash
APP_DIR=/var/www/loja-backend
BACKUP_DIR=/var/backups/loja
TS=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR/$TS"
cp -a "$APP_DIR" "$BACKUP_DIR/$TS/app"
```

If production has `DATABASE_URL`:

```bash
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/$TS/db.sql"
```

If production uses individual DB env vars:

```bash
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USERNAME" \
  "$DB_DATABASE" > "$BACKUP_DIR/$TS/db.sql"
```

## Local Build Package

Run locally from `backend`:

```bash
npm test
npm run build
tar -czf loja-backend-deploy.tar.gz dist src package.json package-lock.json tsconfig.json tsconfig.build.json
```

PowerShell on Windows can use the same `tar` command when available.

## Upload

Replace `USER` and `HOST` with the real VPS access.

```bash
scp loja-backend-deploy.tar.gz USER@HOST:/tmp/loja-backend-deploy.tar.gz
```

## Apply On VPS

```bash
APP_DIR=/var/www/loja-backend

cd "$APP_DIR"
tar -xzf /tmp/loja-backend-deploy.tar.gz
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 status
pm2 logs loja-backend --lines 80
```

## Smoke Test

```bash
curl -i https://api-loja.juliano340.com/products
curl -i https://api-loja.juliano340.com/categories
```

Expected:

- Public endpoints return `200`.
- PM2 process is online.
- Logs do not show missing environment variables.
- Logs do not show TypeORM startup errors.
- Logs do not show Stripe startup errors.

Admin endpoint without token should be denied:

```bash
curl -i https://api-loja.juliano340.com/products/admin/all
```

Expected: `401` or `403`.

## Rollback

Use the backup timestamp created before deploy.

```bash
APP_DIR=/var/www/loja-backend
BACKUP_TS=YYYYMMDD-HHMMSS

pm2 stop loja-backend
rm -rf "$APP_DIR"
cp -a "/var/backups/loja/$BACKUP_TS/app" "$APP_DIR"
pm2 startOrReload "$APP_DIR/ecosystem.config.cjs" --update-env
pm2 status
```

Restore the database only if the failed deploy changed schema or data.

## Troubleshooting

- `JWT_SECRET não configurado`: verify PM2 env and reload with `--update-env`.
- `STRIPE_WEBHOOK_SECRET não configurado`: verify the private VPS env/config, not git files.
- `relation inventory_items does not exist`: confirm inventory tables exist before using product stock/admin inventory flows.
- PM2 still using old env: run `pm2 startOrReload ecosystem.config.cjs --update-env`.
- Frontend `/api` calls fail in production: check `loja-web/vercel.json` rewrite to `https://api-loja.juliano340.com`.
- Direct browser requests blocked by CORS: prefer frontend `/api` rewrite, or update backend CORS only if direct browser access is required.
