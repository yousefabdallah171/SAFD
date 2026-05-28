# Docker Deployment

This project is a `pnpm` monorepo with:

- `artifacts/safd`: Vite frontend
- `artifacts/api-server`: Express API
- `lib/*`: shared workspace packages

The Docker setup added here runs:

- `web`: `nginx` serving the built frontend
- `api`: Node.js running the bundled Express server
- `db`: PostgreSQL for local and single-server deployments

## 1. Prepare env

Create a real env file from the template:

```powershell
Copy-Item .env.example .env
```

Minimum values to change before a live deployment:

- `POSTGRES_PASSWORD`
- `SESSION_SECRET`
- `META_VERIFY_TOKEN` if using Meta webhooks
- `META_APP_SECRET` if webhook signature verification is enabled

## 2. Run locally with Docker

```powershell
docker compose --env-file .env up --build -d
```

The app will be available at:

- Frontend: `http://localhost:8080`
- API health: `http://localhost:8080/api/healthz`

## 3. First database bootstrap

By default, `RUN_DB_PUSH=true` makes the API container run:

```text
pnpm --filter @workspace/db push
```

on startup after the database becomes reachable. This is convenient for first deploys and simple VPS setups.

For stricter production control later, set `RUN_DB_PUSH=false` and run schema updates from your CI/CD or a one-off admin command instead.

## 4. Deploy on a live server

Typical VPS steps:

1. Install Docker Engine and Docker Compose plugin.
2. Copy the project to the server.
3. Create `.env` from `.env.example`.
4. Start the stack:

```bash
docker compose --env-file .env up --build -d
```

5. Put Cloudflare or a host-level reverse proxy in front if you want HTTPS on ports `80/443`.

## 5. Domain / HTTPS

This compose file exposes the frontend on container port `80` and host port `WEB_PORT`.

Common production approaches:

- Keep `WEB_PORT=8080` and proxy your domain from Nginx/Caddy/Traefik on the host.
- Change to `WEB_PORT=80` if the VM is dedicated to this app and you want Docker to bind directly on port 80.

## 6. Notes

- The frontend uses relative `/api/...` calls, so the browser talks to the same origin and `nginx` forwards those requests to the API container.
- The backend defaults to port `3000` if `PORT` is not set.
- The frontend build now defaults to `BASE_PATH=/`, which is suitable for most deployments.
