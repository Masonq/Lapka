#!/usr/bin/env bash
set -e

# Запускать только когда DNS lapki.info уже указывает на этот сервер —
# certbot проверяет это перед выпуском сертификата, иначе упадёт с ошибкой валидации

echo "→ Меняю server_name в nginx с catch-all на настоящий домен"
sed -i 's/server_name _;/server_name lapki.info www.lapki.info;/' /etc/nginx/sites-available/lapabg.conf
nginx -t && systemctl reload nginx

echo "→ Выпускаю SSL-сертификат"
certbot --nginx -d lapki.info -d www.lapki.info --non-interactive --agree-tos -m admin@lapki.info

echo "Готово: https://lapki.info"
echo "Не забудь обновить ALLOWED_ORIGINS в .env на https://lapki.info,https://www.lapki.info и перезапустить backend: docker compose restart backend"
