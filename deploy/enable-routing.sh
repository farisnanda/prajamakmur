#!/usr/bin/env bash
set -euo pipefail

CONF="/etc/apache2/sites-available/apps.conf"
BACKUP="${CONF}.bak-prajamakmur-$(date +%Y%m%d%H%M%S)"

if grep -qE '^[[:space:]]*ProxyPass[[:space:]]+/prajamakmur[[:space:]]' "$CONF"; then
  echo "Routing /prajamakmur sudah tersedia."
  apache2ctl configtest
  systemctl reload apache2
  exit 0
fi

cp -a "$CONF" "$BACKUP"
sed -i '/# Header penting/i\
    # Praja Makmur - isolated Docker deployment on localhost:3010\
    ProxyPass /prajamakmur http://127.0.0.1:3010/prajamakmur timeout=60\
    ProxyPassReverse /prajamakmur http://127.0.0.1:3010/prajamakmur\
' "$CONF"

if ! apache2ctl configtest; then
  cp -a "$BACKUP" "$CONF"
  echo "Konfigurasi tidak valid; backup dipulihkan."
  exit 1
fi

systemctl reload apache2
echo "Routing aktif: https://apps.bkd.jatimprov.go.id/prajamakmur"
echo "Backup: $BACKUP"
