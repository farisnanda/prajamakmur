#!/usr/bin/env bash
# Uji pemulihan: pulihkan backup database ke database SEMENTARA (bukan database
# produksi), hitung isi tabel utama, lalu hapus. Backup yang tidak pernah diuji
# belum bisa dianggap aman.
#
#   ./deploy/restore-test.sh                       # memakai backup terbaru
#   ./deploy/restore-test.sh /path/db-2026....sql.gz
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/bkd/prajamakmur-backups}"
DB_CONTAINER="${DB_CONTAINER:-prajamakmur-db}"
DB_USER="${DB_USER:-}"   # bawaan: POSTGRES_USER milik container
FILE="${1:-$(ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | head -n 1)}"
TEST_DB="restore_test_$(date +%s)"

if [ -z "${FILE:-}" ] || [ ! -f "$FILE" ]; then
  echo "Tidak ada file backup. Beri path, atau jalankan backup.sh dulu." >&2
  exit 1
fi
echo "Memakai: $FILE"

psql_admin() { docker exec -i -e DB_USER="$DB_USER" "$DB_CONTAINER" sh -c 'psql -v ON_ERROR_STOP=1 -U "${DB_USER:-$POSTGRES_USER}" -d postgres "$@"' sh "$@"; }

cleanup() { psql_admin -c "DROP DATABASE IF EXISTS \"$TEST_DB\"" >/dev/null 2>&1 || true; }
trap cleanup EXIT

psql_admin -c "CREATE DATABASE \"$TEST_DB\"" >/dev/null
gzip -dc "$FILE" | docker exec -i -e DB_USER="$DB_USER" "$DB_CONTAINER" sh -c "psql -v ON_ERROR_STOP=1 -q -U \"\${DB_USER:-\$POSTGRES_USER}\" -d \"$TEST_DB\"" >/dev/null

echo "Isi tabel setelah dipulihkan:"
docker exec -i -e DB_USER="$DB_USER" "$DB_CONTAINER" sh -c "psql -U \"\${DB_USER:-\$POSTGRES_USER}\" -d \"$TEST_DB\" -At -F ' : '" <<'SQL'
SELECT 'users', count(*) FROM users
UNION ALL SELECT 'members', count(*) FROM members
UNION ALL SELECT 'loans', count(*) FROM loans
UNION ALL SELECT 'loan_payments', count(*) FROM loan_payments
UNION ALL SELECT 'savings_transactions', count(*) FROM savings_transactions
UNION ALL SELECT 'cash_transactions', count(*) FROM cash_transactions;
SQL

echo "OK: backup dapat dipulihkan. Database uji dihapus."
