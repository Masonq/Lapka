#!/usr/bin/env bash
set -e

cd /opt/lapabg

echo "→ Собираю фронтенд"
cd frontend && npm install && npm run build && cd ..

echo "→ Поднимаю backend + PostgreSQL в Docker"
docker compose up -d --build

echo "→ Накатываю миграции БД"
sleep 3  # даём Postgres время подняться
docker compose exec -T backend alembic upgrade head

echo "→ Подключаю nginx"
cp deploy/nginx.conf /etc/nginx/sites-available/lapabg.conf
ln -sf /etc/nginx/sites-available/lapabg.conf /etc/nginx/sites-enabled/lapabg.conf
nginx -t && systemctl reload nginx

echo "Готово: http://$(curl -s ifconfig.me)"
echo "SSL и домен — отдельным шагом, когда lapki.info будет указывать на этот сервер: bash deploy/enable-ssl.sh"
