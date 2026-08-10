import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.db import Base, engine
from app.routers import admin, auth, blocks, communities, events, follows, marketplace, messages, notifications, pets, posts, prerender, services, stories, uploads, users, ws
from app.core.ws_manager import manager

logger = logging.getLogger("lapabg")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """WebSocket-пуш из синхронных роутов идёт через run_coroutine_threadsafe,
    для этого менеджеру соединений нужна ссылка на реальный event loop процесса —
    её можно получить только изнутри уже запущенного async-контекста."""
    manager.set_main_loop(asyncio.get_running_loop())
    yield

# В проде схема БД накатывается через `alembic upgrade head` (см. deploy/setup.sh и
# deploy/update.sh) — так изменения применяются контролируемо, с историей и возможностью
# отката, а не молча досоздают недостающее при каждом запуске. create_all() оставлен только
# для тестов и быстрой локальной разработки без Alembic, включается явным флагом
if os.getenv("AUTO_CREATE_SCHEMA") == "true":
    Base.metadata.create_all(bind=engine)

app = FastAPI(title="Lapki API", lifespan=lifespan)

if os.getenv("JWT_SECRET", "change-me-in-production") == "change-me-in-production":
    logger.warning(
        "JWT_SECRET не задан или оставлен дефолтным ('change-me-in-production') — "
        "любой, кто это знает, может подделать токен авторизации. "
        "Задай реальный секрет в docker-compose.yml перед выходом в прод."
    )

# По умолчанию — только локальная разработка (Vite dev-сервер). В проде задаётся
# явно через ALLOWED_ORIGINS в docker-compose.yml (см. deploy/setup.sh), например
# ALLOWED_ORIGINS=https://lapki.info — так с чужого сайта не дёрнуть наш API
# из браузера от имени залогиненного пользователя, даже если у него украли токен через XSS
_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(pets.router)
app.include_router(services.router)
app.include_router(follows.router)
app.include_router(uploads.router)
app.include_router(users.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(blocks.router)
app.include_router(stories.router)
app.include_router(prerender.router)
app.include_router(communities.router)
app.include_router(messages.router)
app.include_router(events.router)
app.include_router(marketplace.router)
app.include_router(ws.router)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Lapki"}
