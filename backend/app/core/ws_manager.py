"""Менеджер WebSocket-соединений — простой in-memory pub/sub, без Redis.
Оправдано тем, что деплой однопроцессный (один backend-контейнер, не
несколько реплик за балансировщиком) — если бы был кластер из нескольких
инстансов backend, in-memory-словарь на каждом инстансе видел бы только
СВОИ подключения, и уведомление не дошло бы до пользователя, чьё
соединение висит на другом инстансе. Для одного контейнера это не проблема.

Роуты в проекте синхронные (def, не async def) — SQLAlchemy-сессии сейчас
не asyncio-совместимые, переводить всё на async ради одной фичи было бы
слишком рискованным рефакторингом. Поэтому push из синхронного кода (роут
создал уведомление/сообщение) идёт через notify_user_sync(), который
планирует корутину на главном event loop через run_coroutine_threadsafe —
FastAPI выполняет sync-роуты в отдельном threadpool, из него нельзя просто
await, но можно попросить event loop выполнить корутину и не ждать результата
(fire-and-forget, ошибка доставки не должна ронять сам HTTP-запрос)."""
import asyncio
import logging

from fastapi import WebSocket

logger = logging.getLogger("ws")


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
        self.main_loop: asyncio.AbstractEventLoop | None = None

    def set_main_loop(self, loop: asyncio.AbstractEventLoop):
        self.main_loop = loop

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        conns = self.active_connections.get(user_id)
        if not conns:
            return
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active_connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, message: dict):
        conns = list(self.active_connections.get(user_id, []))
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception:
                # Соединение протухло (клиент закрыл вкладку без штатного disconnect) —
                # не роняем рассылку остальным, просто убираем это соединение
                self.disconnect(user_id, ws)

    def notify_user_sync(self, user_id: str, message: dict):
        """Вызывается из обычного (не async) кода роутов. Не блокирует и не
        поднимает исключение наружу — доставка real-time уведомления никогда
        не должна ронять основной HTTP-запрос, в худшем случае просто не
        придёт мгновенно (у клиента остаётся поллинг как страховка)."""
        if self.main_loop is None:
            return
        try:
            asyncio.run_coroutine_threadsafe(self.send_to_user(user_id, message), self.main_loop)
        except Exception:
            logger.exception("Не удалось отправить real-time уведомление user_id=%s", user_id)


manager = ConnectionManager()
