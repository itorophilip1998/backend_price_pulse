#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy || echo "Migrations may have already been applied"

echo "Starting application..."
exec "$@"

