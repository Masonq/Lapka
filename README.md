# LapaBG

Соцсеть для владельцев животных в Белграде: лента (потеряшки/находки/пристройство/вопросы), профили питомцев, каталог услуг (ситтеры, передержки, кинологи, ветеринары, грумеры).

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
См. `deploy/setup.sh` — поднимает Docker (backend+PostgreSQL), собирает фронт, настраивает nginx и SSL.

## Обновление
См. `deploy/update.sh`.
