#!/bin/sh
set -eu

: "${DIRECT_URL:?DIRECT_URL must be defined for Prisma migrations.}"

DATABASE_URL="$DIRECT_URL" ./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma

exec "$@"
