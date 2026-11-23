#!/usr/bin/env bash
# Backup harian Praja Makmur: database (pg_dump, gzip) + folder foto unggahan.
# Dijalankan dari cron; aman dijalankan berulang. Menyimpan 14 hari terakhir.
#
#   Pasang (sekali):  crontab -e
#   0 2 * * *  /home/bkd/prajamakmur-deploy/deploy/backup.sh >> /home/bkd/prajamakmur-backups/backup.log 2>&1
set -euo pipefail

APP_DIR="${APP_DIR:-/home/bkd/prajamakmur-deploy}"
BACKUP_DIR="${BACKUP_DIR:-/home/bkd/prajamakmur-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
DB_CONTAINER="${DB_CONTAINER:-prajamakmur-db}"
# Bawaan: user dan nama database dari environment container. Boleh ditimpa.
DB_USER="${DB_USER:-}"
DB_NAME="${DB_NAME:-}"

STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
umask 077   # file backup hanya bisa dibaca pemilik

echo "[$(date -Is)] mulai backup"

# 1) Database. Dump ke file sementara dulu; baru dipindah bila lengkap.
TMP="$BACKUP_DIR/.db-$STAMP.sql.gz.part"
trap 'rm -f "$TMP"' EXIT   # buang file sementara bila gagal di tengah jalan
docker exec -e DB_USER="$DB_USER" -e DB_NAME="$DB_NAME" "$DB_CONTAINER" \
  sh -c 'pg_dump -U "${DB_USER:-$POSTGRES_USER}" "${DB_NAME:-$POSTGRES_DB}"' | gzip -9 > "$TMP"
if [ ! -s "$TMP" ]; then
  echo "GAGAL: hasil dump kosong" >&2
  rm -f "$TMP"
  exit 1
fi
# Dump yang sehat selalu berakhir dengan baris penutup pg_dump.
if ! gzip -dc "$TMP" | tail -n 5 | grep -q "PostgreSQL database dump complete"; then
  echo "GAGAL: dump tidak lengkap" >&2
  rm -f "$TMP"
  exit 1
fi
mv "$TMP" "$BACKUP_DIR/db-$STAMP.sql.gz"

# 2) Foto unggahan (landing dan berita).
if [ -d "$APP_DIR/data/uploads" ]; then
  tar -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" -C "$APP_DIR/data" uploads
fi

# 3) Hapus backup yang lebih tua dari KEEP_DAYS hari.
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -print -delete

echo "[$(date -Is)] selesai: db-$STAMP.sql.gz ($(du -h "$BACKUP_DIR/db-$STAMP.sql.gz" | cut -f1))"
