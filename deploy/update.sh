#!/usr/bin/env bash
set -e

cd /opt/lapabg

echo "→ Подтягиваю новый код"
git pull

echo "→ Обновляю фронтенд"
cd frontend && npm install && npm run build && cd ..

echo "→ Пересобираю backend"
docker compose up -d --build

echo "→ Накатываю миграции БД"
docker compose exec -T backend alembic upgrade head

echo "→ Проверяю расхождение nginx-конфига с сервером"
# Не полный diff (deploy/nginx.conf — общий шаблон без SSL/Certbot-секций,
# которые всегда будут отличаться от реального файла на сервере, это
# ожидаемо и не является проблемой) — точечная сверка: каждый location-блок
# из шаблона должен реально присутствовать в активной конфигурации nginx.
# Именно отсутствие одного такого блока (location /api/ws) вызвало
# WebSocket-инцидент — этот шаг предупреждает о подобном заранее.
#
# Сверяем именно файл этого сайта (не весь `nginx -T`) — на сервере
# несколько сайтов в sites-enabled/ (imamesta, pokerzone и т.д.), все они
# попадают в общий вывод `nginx -T`. Короткие location-пути вроде "= /"
# могут случайно совпасть с несвязанным кодом другого сайта (например,
# его собственным "location = /favicon.ico"), давая ложноотрицательный
# результат — проверка скажет "всё в порядке", хотя блока реально нет.
SITE_CONF="/etc/nginx/sites-enabled/lapabg.conf"
if command -v nginx >/dev/null 2>&1 && [ -f "$SITE_CONF" ]; then
    missing=""
    while IFS= read -r loc; do
        if ! grep -qF "$loc" "$SITE_CONF"; then
            missing="$missing\n  location $loc"
        fi
    done < <(grep -oP '^\s*location\s+\K[^{]+' deploy/nginx.conf | sed 's/\s*$//')

    if [ -n "$missing" ]; then
        echo ""
        echo "⚠️  ВНИМАНИЕ: в deploy/nginx.conf есть location-блоки, которых нет"
        echo "   в $SITE_CONF (deploy НЕ копирует"
        echo "   nginx.conf автоматически — правки конфига всегда ручные):"
        echo -e "$missing"
        echo ""
        echo "   Если это осознанно — игнорируй. Если нет — сверь"
        echo "   $SITE_CONF с deploy/nginx.conf вручную."
        echo ""
    else
        echo "   Расхождений не найдено"
    fi
fi

echo "→ Перечитываю nginx"
nginx -t && systemctl reload nginx

echo "Готово"
