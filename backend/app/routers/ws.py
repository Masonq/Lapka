"""WebSocket для real-time доставки: новые сообщения, новые уведомления.
Токен передаётся query-параметром (?token=...), не заголовком Authorization —
нативный WebSocket API браузера не поддерживает кастомные заголовки при
установке соединения, это общепринятый способ для WS-аутентификации."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.security import ALGORITHM, SECRET_KEY
from app.core.ws_manager import manager

router = APIRouter(tags=["ws"])


@router.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise JWTError("нет sub в токене")
    except JWTError:
        await websocket.close(code=4001)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            # Клиент ничего осмысленного не шлёт — просто держим соединение живым.
            # receive_text() блокируется до следующего сообщения ИЛИ до разрыва
            # соединения (WebSocketDisconnect), это и есть весь цикл жизни сокета
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
