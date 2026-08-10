def test_ws_connect_with_valid_token(client, register_user_with_id):
    headers, user_id = register_user_with_id()
    token = headers["Authorization"].split(" ")[1]

    with client.websocket_connect(f"/api/ws?token={token}") as ws:
        # Соединение установилось без исключения — этого достаточно, само по
        # себе оно ничего не шлёт, пока не произойдёт какое-то событие
        pass


def test_ws_rejects_invalid_token(client):
    import pytest
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/api/ws?token=garbage-not-a-real-jwt"):
            pass


def test_ws_receives_follow_notification_end_to_end(client, register_user, register_user_with_id):
    """Сквозная проверка всего пути: HTTP-запрос подписки -> запись в БД ->
    реальный WebSocket-пуш -> клиент получает событие. Не мок, реальный
    TestClient.websocket_connect слушает настоящее соединение."""
    headers_follower = register_user("Подписчик")
    headers_followed, followed_id = register_user_with_id("Автор")
    token_followed = headers_followed["Authorization"].split(" ")[1]

    with client.websocket_connect(f"/api/ws?token={token_followed}") as ws:
        client.post(f"/api/follows/{followed_id}", headers=headers_follower)
        data = ws.receive_json()
        assert data["type"] == "new_notification"
        assert data["notification_type"] == "follow"


def test_ws_receives_new_message_end_to_end(client, register_user_with_id):
    headers_sender, _ = register_user_with_id("Отправитель")
    headers_recipient, recipient_id = register_user_with_id("Получатель")
    token_recipient = headers_recipient["Authorization"].split(" ")[1]

    with client.websocket_connect(f"/api/ws?token={token_recipient}") as ws:
        client.post(
            f"/api/messages/{recipient_id}", json={"body": "Привет!"}, headers=headers_sender
        )
        data = ws.receive_json()
        assert data["type"] == "new_message"
        assert data["from_display_name"] == "Отправитель"
        assert data["body"] == "Привет!"


def test_ws_does_not_crash_request_when_recipient_not_connected(client, register_user, register_user_with_id):
    """Получатель не подключён по WebSocket вообще — push должен тихо
    не сработать, не уронив сам HTTP-запрос подписки/сообщения."""
    headers_follower = register_user("Подписчик")
    _, followed_id = register_user_with_id("Автор")

    r = client.post(f"/api/follows/{followed_id}", headers=headers_follower)
    assert r.status_code == 200
