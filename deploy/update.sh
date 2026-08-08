#!/usr/bin/env bash
set -e

cd /opt/lapabg

echo "→ Обновляю фронтенд"
cd frontend && npm install && npm run build && cd ..

echo "→ Пересобираю backend"
docker compose up -d --build

echo "→ Накатываю миграции БД"
docker compose exec -T backend alembic upgrade head

echo "→ Перечитываю nginx"
nginx -t && systemctl reload nginx

echo "Готово"
