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
# WebSocket-инцидент — этот шаг предупреждает о подобном заранее, а не
# оставляет расхождение незамеченным до следующего похожего сбоя.
if command -v nginx >/dev/null 2>&1; then
    active_conf="$(nginx -T 2>/dev/null)"
    missing=""
    while IFS= read -r loc; do
        if ! grep -qF "$loc" <<< "$active_conf"; then
            missing="$missing\n  location $loc"
        fi
    done < <(grep -oP '^\s*location\s+\K[^{]+' deploy/nginx.conf | sed 's/\s*$//')

    if [ -n "$missing" ]; then
        echo ""
        echo "⚠️  ВНИМАНИЕ: в deploy/nginx.conf есть location-блоки, которых нет"
        echo "   в активной конфигурации nginx на сервере (deploy НЕ копирует"
        echo "   nginx.conf автоматически — правки конфига всегда ручные):"
        echo -e "$missing"
        echo ""
        echo "   Если это осознанно — игнорируй. Если нет — сверь"
        echo "   /etc/nginx/sites-enabled/*.conf с deploy/nginx.conf вручную."
        echo ""
    else
        echo "   Расхождений не найдено"
    fi
fi

echo "→ Перечитываю nginx"
nginx -t && systemctl reload nginx

echo "Готово"
