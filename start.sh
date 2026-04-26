#!/bin/bash
set -euo pipefail

ENV=${1:-}

if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
  echo "Usage: ./start.sh [dev|prod]"
  exit 1
fi

COMPOSE_FILE="docker-compose.${ENV}.yml"

# Prod-only env validation
if [[ "$ENV" == "prod" ]]; then
  if [[ ! -f .env ]]; then
    echo "Error: root .env not found. See README — MongoDB credentials required."
    exit 1
  fi
  if grep -q "REPLACE_WITH" .env 2>/dev/null || grep -q "REPLACE_WITH" backend/.env.prod 2>/dev/null; then
    echo "Error: placeholder values found in .env or backend/.env.prod. Fill in real credentials before deploying."
    exit 1
  fi
fi

# Detect first run by asking Docker Compose for the resolved volume name
BUILD_FLAG=""
VOLUME_NAME=$(docker compose -f "$COMPOSE_FILE" config --volumes | grep mongo)

if [[ -z "$VOLUME_NAME" ]] || ! docker volume ls --format '{{.Name}}' | grep -q "^${VOLUME_NAME}$"; then
  echo "First run detected — building images."
  BUILD_FLAG="--build"
fi

docker compose -f "$COMPOSE_FILE" up -d $BUILD_FLAG

echo ""
echo "Stack is up. View logs: docker compose -f $COMPOSE_FILE logs -f"
