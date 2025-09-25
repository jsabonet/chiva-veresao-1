#!/usr/bin/env bash
# Usage: ./scripts/deploy_frontend_prebuilt.sh <ssh_user>@<host> [ssh_port] [ssh_key]
# Example: ./scripts/deploy_frontend_prebuilt.sh root@123.45.67.89 22 ~/.ssh/id_rsa

set -euo pipefail

REMOTE="${1:-}"    # user@host
SSH_PORT="${2:-22}"
SSH_KEY="${3:-}"    # optional path to private key

if [[ -z "$REMOTE" ]]; then
  echo "Usage: $0 <user@host> [port] [ssh_key]"
  exit 2
fi

FRONTEND_DIR="$(cd "$(dirname "$0")/.." && pwd)/frontend"
DIST_DIR="$FRONTEND_DIR/dist"

# Build locally
echo "Building frontend (local)..."
cd "$FRONTEND_DIR"
rm -rf node_modules
npm ci
npm run build

# Backup remote dist and copy new dist
echo "Copying dist to remote $REMOTE:$FRONTEND_DIR"
SSH_OPTS=( -p "$SSH_PORT" )
if [[ -n "$SSH_KEY" ]]; then
  SSH_OPTS+=( -i "$SSH_KEY" )
fi

# create remote backup and directory
ssh "${SSH_OPTS[@]}" "$REMOTE" "mkdir -p $FRONTEND_DIR && mv $FRONTEND_DIR/dist $FRONTEND_DIR/dist.bak_$(date +%s) || true && mkdir -p $FRONTEND_DIR/dist"

# copy (use tar over ssh for performance)
cd "$DIST_DIR"
tar -czf - . | ssh "${SSH_OPTS[@]}" "$REMOTE" "tar -xzf - -C $FRONTEND_DIR/dist"

# Rebuild docker image on remote using prebuilt dist
echo "Triggering remote docker-compose build (BUILD_FRONTEND=false) and up"
ssh "${SSH_OPTS[@]}" "$REMOTE" "cd $(dirname $FRONTEND_DIR) && docker compose build --no-cache --build-arg BUILD_FRONTEND=false frontend && docker compose up -d frontend"

echo "Deploy complete."
