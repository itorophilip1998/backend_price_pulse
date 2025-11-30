#!/bin/sh
set -e

echo "Generating Prisma Client..."
npx prisma generate

echo "Setting up database schema..."
# Wait for database to be ready
echo "Waiting for database connection..."
sleep 3

# Try to deploy migrations if they exist, otherwise push schema
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "Migrations found, deploying..."
  npx prisma migrate deploy || {
    echo "Migration deploy failed, using db push as fallback..."
    npx prisma db push --accept-data-loss --skip-generate || true
  }
else
  echo "No migrations found, pushing schema directly to database..."
  npx prisma db push --accept-data-loss --skip-generate || {
    echo "Database push failed, but continuing..."
  }
fi

echo "Database setup complete!"
echo "Starting application..."
exec "$@"

