#!/bin/bash
# Monitor-mode canary for edge-device-registry auth behavior.
# Runs no-key / bad-key / good-key probes and reports HTTP status.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REGION="${AWS_REGION:-af-south-1}"
PARAM_NAME="${EDGE_DEVICE_REGISTRY_API_KEY_PARAM:-/ona-platform/prod/edge-device-registry/api-key}"
BASE_URL="${EDGE_DEVICE_REGISTRY_BASE_URL:-http://127.0.0.1:8082}"

if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI not found"
  exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1; then
  echo "ERROR: docker-compose not found"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: docker daemon not reachable"
  exit 1
fi

KEY="$(aws ssm get-parameter \
  --name "$PARAM_NAME" \
  --with-decryption \
  --region "$REGION" \
  --query 'Parameter.Value' \
  --output text)"

export EDGE_DEVICE_REGISTRY_AUTH_MODE="monitor"
export EDGE_DEVICE_REGISTRY_API_KEY="$KEY"
export EDGE_DEVICE_REGISTRY_ALLOWED_API_KEYS="${EDGE_DEVICE_REGISTRY_ALLOWED_API_KEYS:-}"

echo "[1/4] Starting edge-device-registry in monitor mode..."
docker-compose up -d edge-device-registry >/tmp/edge-registry-canary-up.log 2>&1

echo "[2/4] Waiting for health endpoint..."
for _ in {1..30}; do
  if curl -sf "${BASE_URL}/health" >/tmp/edge-registry-health.json; then
    break
  fi
  sleep 2
done

if ! curl -sf "${BASE_URL}/health" >/tmp/edge-registry-health.json; then
  echo "ERROR: edge-device-registry health check failed"
  echo "---- docker-compose logs (edge-device-registry) ----"
  docker-compose logs --tail=120 edge-device-registry || true
  exit 1
fi

echo "[3/4] Running monitor-mode probes..."
NO_KEY="$(curl -s -o /tmp/edge-registry-no-key.json -w "%{http_code}" "${BASE_URL}/api/devices")"
BAD_KEY="$(curl -s -o /tmp/edge-registry-bad-key.json -w "%{http_code}" -H "X-API-Key: invalid-key" "${BASE_URL}/api/devices")"
GOOD_KEY="$(curl -s -o /tmp/edge-registry-good-key.json -w "%{http_code}" -H "X-API-Key: ${KEY}" "${BASE_URL}/api/devices")"

echo "[4/4] Canary results"
echo "health:   $(cat /tmp/edge-registry-health.json)"
echo "no_key:   ${NO_KEY}"
echo "bad_key:  ${BAD_KEY}"
echo "good_key: ${GOOD_KEY}"

if [[ "$NO_KEY" != "200" || "$BAD_KEY" != "200" || "$GOOD_KEY" != "200" ]]; then
  echo "FAIL: monitor mode should preserve functional behavior (all 200)"
  exit 2
fi

echo "PASS: monitor mode preserved behavior for no-key/bad-key/good-key probes"
