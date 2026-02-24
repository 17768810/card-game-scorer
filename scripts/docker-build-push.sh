#!/bin/bash
# Build and push images to private registry
# Usage: ./scripts/docker-build-push.sh [tag]

set -e

REGISTRY="8.133.3.7:5000"
PROJECT="card-game-scorer"
TAG="1.0.0"

SERVER_IMAGE="$REGISTRY/$PROJECT/server:$TAG"
CLIENT_IMAGE="$REGISTRY/$PROJECT/client:$TAG"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Building server image: $SERVER_IMAGE"
docker build -t "$SERVER_IMAGE" "$ROOT_DIR/server"

echo "==> Building client image: $CLIENT_IMAGE"
docker build -t "$CLIENT_IMAGE" "$ROOT_DIR/client"

echo "==> Pushing $SERVER_IMAGE"
docker push "$SERVER_IMAGE"

echo "==> Pushing $CLIENT_IMAGE"
docker push "$CLIENT_IMAGE"

echo "==> Done. Images pushed to $REGISTRY"
