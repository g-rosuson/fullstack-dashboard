#!/bin/bash
set -euo pipefail

ENV=${1:-}

if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
  echo "Usage: ./reset.sh [dev|prod]"
  exit 1
fi

echo "WARNING: This will permanently delete all $ENV database data."
read -p "Type '$ENV' to confirm: " CONFIRM

if [[ "$CONFIRM" != "$ENV" ]]; then
  echo "Aborted."
  exit 1
fi

docker compose -f "docker-compose.${ENV}.yml" down -v
echo "Stack and volumes removed."
