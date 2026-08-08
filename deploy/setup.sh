#!/usr/bin/env bash
set -e

cd /opt/lapabg

echo "→ Собираю фронтенд"
cd frontend && npm install && npm run build && cd ..

echo "→ Поднимаю backend + PostgreSQL в Docker"
docker compose up -d --build

echo "→ Подключаю nginx"
cp deploy/nginx.conf /etc/nginx/sites-available/lapabg.conf
ln -sf /etc/nginx/sites-available/lapabg.conf /etc/nginx/sites-enabled/lapabg.conf
nginx -t && systemctl reload nginx

echo "→ Выпускаю SSL-сертификат"
certbot --nginx -d lapa.flatro.app --non-interactive --agree-tos -m admin@flatro.app

echo "Готово: https://lapa.flatro.app"
