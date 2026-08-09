#!/usr/bin/env bash
set -e

# Запускать только когда DNS lapa.flatro.app уже указывает на этот сервер —
# certbot проверяет это перед выпуском сертификата, иначе упадёт с ошибкой валидации

echo "→ Меняю server_name в nginx с catch-all на настоящий домен"
sed -i 's/server_name _;/server_name lapa.flatro.app;/' /etc/nginx/sites-available/lapabg.conf
nginx -t && systemctl reload nginx

echo "→ Выпускаю SSL-сертификат"
certbot --nginx -d lapa.flatro.app --non-interactive --agree-tos -m admin@flatro.app

echo "Готово: https://lapa.flatro.app"
echo "Не забудь обновить ALLOWED_ORIGINS в .env на https://lapa.flatro.app и перезапустить backend: docker compose restart backend"
