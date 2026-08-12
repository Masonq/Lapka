#!/usr/bin/env bash
set -e

CONF=/etc/nginx/sites-enabled/lapabg.conf
BACKUP_DIR=/opt/lapabg/nginx-backups
mkdir -p "$BACKUP_DIR"
BACKUP="$BACKUP_DIR/lapabg.conf.bak.$(date +%Y%m%d-%H%M%S)"

cp "$CONF" "$BACKUP"
echo "Бэкап сохранён: $BACKUP"

python3 - "$CONF" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path) as f:
    content = f.read()

changed = False

# 1. location = /sitemap.xml — вставляю перед location /api/ws (простой,
# безусловный proxy, не зависит от порядка относительно других блоков)
if "location = /sitemap.xml" not in content:
    marker = "    location /api/ws {\n"
    if marker not in content:
        print("ОШИБКА: не нашёл 'location /api/ws {', не могу вставить sitemap.xml блок.")
        sys.exit(1)
    block = (
        "    location = /sitemap.xml {\n"
        "        rewrite ^ /api/sitemap.xml break;\n"
        "        proxy_pass http://127.0.0.1:8020;\n"
        "    }\n\n"
    )
    content = content.replace(marker, block + marker, 1)
    changed = True
    print("Блок /sitemap.xml вставлен.")
else:
    print("Блок /sitemap.xml уже есть, пропускаю.")

# 2. location ~ ^/communities/... — вставляю сразу после блока /events/,
# рядом с остальными regex-location для пререндера (posts/marketplace/events)
if "location ~ ^/communities/" not in content:
    marker = (
        "    location ~ ^/events/([^/]+)/?$ {\n"
        "        if ($is_bot) {\n"
        "            rewrite ^/events/([^/]+)/?$ /api/prerender/events/$1 break;\n"
        "            proxy_pass http://127.0.0.1:8020;\n"
        "        }\n"
        "        try_files $uri $uri/ /index.html;\n"
        "        add_header Cache-Control \"no-cache\" always;\n"
        "    }\n"
    )
    if marker not in content:
        print("ОШИБКА: не нашёл блок 'location ~ ^/events/', не могу вставить communities блок.")
        sys.exit(1)
    block = (
        "\n"
        "    location ~ ^/communities/([^/]+)/?$ {\n"
        "        if ($is_bot) {\n"
        "            rewrite ^/communities/([^/]+)/?$ /api/prerender/communities/$1 break;\n"
        "            proxy_pass http://127.0.0.1:8020;\n"
        "        }\n"
        "        try_files $uri $uri/ /index.html;\n"
        "        add_header Cache-Control \"no-cache\" always;\n"
        "    }\n"
    )
    content = content.replace(marker, marker + block, 1)
    changed = True
    print("Блок /communities/ вставлен.")
else:
    print("Блок /communities/ уже есть, пропускаю.")

if changed:
    with open(path, "w") as f:
        f.write(content)
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
