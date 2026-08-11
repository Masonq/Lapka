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

if "map $http_user_agent $is_bot" in content:
    print("map-блок уже есть в файле, ничего не делаю.")
    sys.exit(0)

# map-директива обязана жить на верхнем уровне файла (в http{}-контексте,
# куда этот файл целиком подключается через sites-enabled/*), а не внутри
# server{} — вставляю её самой первой строкой файла
map_block = (
    "# Пререндер для поисковиков/соцсетей (Googlebot, Telegram, WhatsApp, Facebook и т.д.) —\n"
    "# см. backend/app/routers/prerender.py. Обычные пользователи никогда не видят эти\n"
    "# ответы, только известные краулеры по User-Agent\n"
    "map $http_user_agent $is_bot {\n"
    "    default 0;\n"
    "    ~*googlebot 1;\n"
    "    ~*bingbot 1;\n"
    "    ~*yandex 1;\n"
    "    ~*duckduckbot 1;\n"
    "    ~*baiduspider 1;\n"
    "    ~*facebookexternalhit 1;\n"
    "    ~*twitterbot 1;\n"
    "    ~*linkedinbot 1;\n"
    "    ~*telegrambot 1;\n"
    "    ~*whatsapp 1;\n"
    "    ~*slackbot 1;\n"
    "    ~*discordbot 1;\n"
    "    ~*pinterest 1;\n"
    "    ~*redditbot 1;\n"
    "    ~*applebot 1;\n"
    "}\n\n"
)
content = map_block + content

# 4 новых location-блока вставляю прямо перед существующим "location / {" —
# nginx позволяет location = / (точное совпадение) и регэксп-location'ы
# сосуществовать с обычным location / (префикс-совпадение), ничего не
# заменяю, только добавляю рядом
marker = "    location / {\n        try_files $uri $uri/ /index.html;\n    }\n"
if marker not in content:
    print("ОШИБКА: не нашёл ожидаемый блок 'location / { try_files ... }', ничего не менял.")
    sys.exit(1)

new_locations = (
    "    location = / {\n"
    "        if ($is_bot) {\n"
    "            rewrite ^ /api/prerender break;\n"
    "            proxy_pass http://127.0.0.1:8020;\n"
    "        }\n"
    "        try_files $uri $uri/ /index.html;\n"
    "        add_header Cache-Control \"no-cache\" always;\n"
    "    }\n\n"
    "    location ~ ^/posts/([^/]+)/?$ {\n"
    "        if ($is_bot) {\n"
    "            rewrite ^/posts/([^/]+)/?$ /api/prerender/posts/$1 break;\n"
    "            proxy_pass http://127.0.0.1:8020;\n"
    "        }\n"
    "        try_files $uri $uri/ /index.html;\n"
    "        add_header Cache-Control \"no-cache\" always;\n"
    "    }\n\n"
    "    location ~ ^/marketplace/([^/]+)/?$ {\n"
    "        if ($is_bot) {\n"
    "            rewrite ^/marketplace/([^/]+)/?$ /api/prerender/marketplace/$1 break;\n"
    "            proxy_pass http://127.0.0.1:8020;\n"
    "        }\n"
    "        try_files $uri $uri/ /index.html;\n"
    "        add_header Cache-Control \"no-cache\" always;\n"
    "    }\n\n"
    "    location ~ ^/events/([^/]+)/?$ {\n"
    "        if ($is_bot) {\n"
    "            rewrite ^/events/([^/]+)/?$ /api/prerender/events/$1 break;\n"
    "            proxy_pass http://127.0.0.1:8020;\n"
    "        }\n"
    "        try_files $uri $uri/ /index.html;\n"
    "        add_header Cache-Control \"no-cache\" always;\n"
    "    }\n\n"
)
# Заодно приводим существующий общий location / к тому же виду, что и
# остальные SPA-роуты (no-cache на index.html — HTML-шелл не должен
# агрессивно кэшироваться браузером, иначе после деплоя новой версии
# фронтенда часть пользователей будет видеть старую страницу)
updated_generic = (
    "    location / {\n"
    "        try_files $uri $uri/ /index.html;\n"
    "        add_header Cache-Control \"no-cache\" always;\n"
    "    }\n"
)

content = content.replace(marker, new_locations + updated_generic, 1)

with open(path, "w") as f:
    f.write(content)

print("map-блок и 4 location-блока пререндера вставлены.")
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
