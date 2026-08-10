#!/usr/bin/env bash
set -e

cd /opt/lapabg

# Этот скрипт — только для ПЕРВОНАЧАЛЬНОЙ установки. Повторный запуск на уже
# настроенном сервере переписывает nginx-конфиг (cp + ln -sf ниже) поверх
# того, что мог модифицировать certbot при выпуске SSL-сертификата — так
# уже случалось: задвоенные директивы и, похоже, sites-enabled из симлинка
# превратился в отдельный файл. Для обновления кода используй deploy/update.sh
if [ -f /etc/nginx/sites-enabled/lapabg.conf ]; then
  echo "nginx уже настроен (/etc/nginx/sites-enabled/lapabg.conf существует)."
  echo "Если нужно обновить код — используй: bash deploy/update.sh"
  echo "Если точно нужно пересоздать nginx-конфиг с нуля — сначала вручную"
  echo "сохрани текущий (там могут быть правки certbot), потом удали файл и запусти снова."
  exit 1
fi

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
