#!/bin/sh
set -eu

if [ "${RUN_DB_PUSH:-false}" = "true" ]; then
  echo "Waiting for database..."
  until node -e "const net = require('node:net'); const socket = net.connect({ host: 'db', port: 5432 }); socket.on('connect', () => { socket.end(); process.exit(0); }); socket.on('error', () => process.exit(1)); setTimeout(() => process.exit(1), 2000);"
  do
    sleep 2
  done

  echo "Applying database schema with drizzle-kit push..."
  pnpm --filter @workspace/db push
fi

exec node --enable-source-maps /app/artifacts/api-server/dist/index.mjs
