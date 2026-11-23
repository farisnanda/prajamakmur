#!/bin/sh
# Mulai sebagai root hanya untuk menyiapkan folder, lalu jalankan aplikasi sebagai
# user "node" (bukan root). Folder unggahan dipasang dari host dan biasanya milik
# root, jadi dibetulkan dulu supaya aplikasi tetap bisa menyimpan foto.
set -e

mkdir -p /app/public/uploads/landing /app/public/uploads/news /app/.next/cache
chown -R node:node /app/public/uploads /app/.next/cache

exec env HOME=/home/node su-exec node:node sh -c "npx prisma migrate deploy && exec npm run start"
