#!/usr/bin/env sh
set -eu

if [ ! -f .env.production ]; then
  echo "Missing .env.production"
  echo "Create it once with:"
  echo "  cp .env.production.example .env.production"
  echo "Then edit APP_BASE_URL, SESSION_SECRET, NOCODB_URL, and NOCODB_TOKEN."
  exit 1
fi

git pull --ff-only
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
APP_PORT="$(awk -F= '/^PORT=/{print $2; exit}' .env.production | tr -d '\r' || true)"
APP_PORT="${APP_PORT:-3001}"
curl -fsS "http://localhost:${APP_PORT}/api/health"
echo
echo "Production deploy complete."
