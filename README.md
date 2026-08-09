# PetSocial (бывш. LapaBG)

Соцсеть для владельцев животных в Белграде. Выросла из простого приложения
потеряшек/услуг в более широкое видение — полноценная соцсеть по образцу
`docs/product-blueprint.md` (Home/Explore/Create/Messages/Profile, Pet Hub,
сообщества, события/прогулки, health-трекер, marketplace). Реализовано пока
не всё — раздел «Статус разделов» ниже показывает, что уже работает, а что
в разработке.

Технически: репозиторий, домен (`lapa.flatro.app`) и имена в инфраструктуре
(база данных, volume) остались от старого имени LapaBG — смена этого требует
действий с DNS/GitHub и делается отдельно, если понадобится.

## Стек
- Backend: FastAPI + SQLAlchemy + PostgreSQL, JWT-авторизация (email/пароль + Telegram Login Widget)
- Frontend: React + Vite, iOS-style glass UI

## Переменные окружения (backend/.env или docker-compose)
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_SECRET` — секрет для подписи токенов (обязательно сменить в проде)
- `TELEGRAM_BOT_TOKEN` — токен бота для проверки подписи Telegram Login Widget

## Локальный запуск
```
docker compose up -d --build
cd frontend && npm install && npm run dev
```

## Миграции БД

Схема управляется через Alembic — `docker-compose.yml` не создаёт таблицы автоматически,
только миграции. При добавлении/изменении модели в `app/models/models.py`:

```
cd backend
alembic revision --autogenerate -m "описание изменения"
alembic upgrade head   # применить локально
```

Сгенерированную миграцию нужно всегда просматривать перед коммитом — автогенерация
не всегда угадывает верно (например, переименование колонки увидит как удаление одной
и добавление другой). На сервере миграции накатываются автоматически в `deploy/update.sh`.

## Тесты

35 тестов бэкенда покрывают авторизацию, посты (CRUD, поиск, пагинация, rate limiting),
питомцев, услуги (защита от накрутки рейтинга) и загрузку изображений (срез EXIF/GPS,
отклонение подделок). Гоняются автоматически в GitHub Actions на каждый пуш.

```
cd backend
pip install -r requirements-dev.txt
pytest -v
```

## Деплой на сервер (первый раз)
См. `deploy/setup.sh` — поднимает Docker (backend+PostgreSQL), собирает фронт, накатывает
миграции, настраивает nginx (без SSL — работает сразу по IP сервера).

SSL и домен — отдельный шаг, когда домен уже указывает на сервер: `bash deploy/enable-ssl.sh`.

## Обновление
См. `deploy/update.sh`.

## Бэкапы
`deploy/backup.sh` — дамп PostgreSQL + архив загруженных файлов, хранится в `/opt/lapabg-backups`
(вне `/opt/lapabg`, чтобы деплой/git pull их не задел). Ротация — хранятся последние 14 дней.

Поставить на cron (каждый день в 4 утра):
```
(crontab -l 2>/dev/null; echo "0 4 * * * cd /opt/lapabg && bash deploy/backup.sh >> /var/log/lapabg-backup.log 2>&1") | crontab -
```

Восстановление: `bash deploy/restore.sh` (берёт последний бэкап) или
`bash deploy/restore.sh /opt/lapabg-backups/db_ДАТА.sql.gz` (конкретный). Разрушительно —
спрашивает подтверждение перед тем, как перезаписать текущую базу.

**Важно**: это только локальные бэкапы на том же диске/сервере. Если откажет сам сервер —
пропадут вместе с оригиналом. Копия за пределами этого VPS (другая машина, S3 и т.п.) —
отдельный шаг, который здесь не настроен.
