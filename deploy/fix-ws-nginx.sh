#!/usr/bin/env bash
set -e

CONF=/etc/nginx/sites-enabled/lapabg.conf
BACKUP="$CONF.bak.$(date +%Y%m%d-%H%M%S)"

cp "$CONF" "$BACKUP"
echo "Бэкап сохранён: $BACKUP"

python3 - "$CONF" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path) as f:
    content = f.read()

marker = "    location /api/ {\n"
if marker not in content:
    print("ОШИБКА: не нашёл 'location /api/ {' в файле, ничего не менял.")
    sys.exit(1)

if "location /api/ws" in content:
    print("Блок /api/ws уже есть в файле, ничего не делаю.")
    sys.exit(0)

block = (
    "    location /api/ws {\n"
    "        access_log off;\n"
    "        proxy_pass http://127.0.0.1:8020/api/ws;\n"
    "        proxy_http_version 1.1;\n"
    "        proxy_set_header Upgrade $http_upgrade;\n"
    "        proxy_set_header Connection \"upgrade\";\n"
    "        proxy_set_header Host $host;\n"
    "        proxy_set_header X-Real-IP $remote_addr;\n"
    "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n"
    "        proxy_set_header X-Forwarded-Proto $scheme;\n"
    "        proxy_read_timeout 3600s;\n"
    "    }\n\n"
)

content = content.replace(marker, block + marker, 1)

with open(path, "w") as f:
    f.write(content)

print("Блок /api/ws вставлен.")
PYEOF

echo ""
echo "→ Проверяю синтаксис nginx"
nginx -t

echo ""
echo "→ Перечитываю nginx"
systemctl reload nginx

echo ""
echo "Готово. Если что-то пошло не так — восстановить бэкап:"
echo "  cp $BACKUP $CONF && systemctl reload nginx"
