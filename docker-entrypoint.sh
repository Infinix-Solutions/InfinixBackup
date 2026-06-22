#!/bin/sh
set -e

# Match docker socket GID so nuxt user can access it
if [ -S /var/run/docker.sock ]; then
  SOCK_GID=$(stat -c '%g' /var/run/docker.sock)
  if ! getent group "$SOCK_GID" > /dev/null 2>&1; then
    addgroup -g "$SOCK_GID" dockerhost
  fi
  adduser nuxt "$(getent group "$SOCK_GID" | cut -d: -f1)" 2>/dev/null || true
fi

exec su-exec nuxt "$@"
