#!/usr/bin/env bash
# Zero-downtime deployment script for safd.youesf-abdallah.online
# Strategy:
#   1. Build new images (no impact on running containers)
#   2. Run DB migration in a one-off container (no API downtime)
#   3. Restart API — nginx retries for 30s, new container is up in ~3s => zero downtime
#   4. Wait for API healthy, then restart web (nginx, ~1s)
set -euo pipefail

PROJECT_DIR="/home/youesf-abdallah-safd/htdocs/safd.youesf-abdallah.online"
cd "$PROJECT_DIR"

echo "=== [1/5] Pulling latest code ==="
git pull origin main

echo "=== [2/5] Building new Docker images ==="
docker compose --env-file .env build

echo "=== [3/5] Running DB migrations (no downtime) ==="
# Spin up a one-off API container connected to the live DB network.
# The running API container is not touched during this step.
docker compose --env-file .env run --rm --no-deps \
  -e RUN_DB_PUSH=false \
  api sh -c "pnpm --filter @workspace/db push"

echo "=== [4/5] Restarting API (zero-downtime: nginx retries during swap) ==="
# Disable RUN_DB_PUSH so API starts instantly (migration already done above)
docker compose --env-file .env up -d --no-deps \
  -e RUN_DB_PUSH=false \
  api 2>/dev/null || \
  docker compose --env-file .env up -d --no-deps api

echo "    Waiting for API to become healthy..."
ATTEMPTS=0
until docker compose ps api | grep -q "(healthy)"; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 40 ]; then
    echo "ERROR: API did not become healthy after 120s"
    docker compose logs --tail=50 api
    exit 1
  fi
  sleep 3
done
echo "    API is healthy."

echo "=== [5/5] Restarting web (nginx, ~1s) ==="
docker compose --env-file .env up -d --no-deps web

echo "    Waiting for web to become healthy..."
ATTEMPTS=0
until docker compose ps web | grep -q "(healthy)"; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 20 ]; then
    echo "ERROR: Web did not become healthy after 60s"
    docker compose logs --tail=30 web
    exit 1
  fi
  sleep 3
done
echo "    Web is healthy."

echo ""
echo "=== Deployment complete! ==="
docker compose ps
