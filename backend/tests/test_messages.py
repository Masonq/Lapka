def test_send_and_read_message(client, register_user, register_user_with_id):
    headers_sender = register_user("Отправитель")
    headers_recipient, recipient_id = register_user_with_id("Получатель")

    r = client.post(f"/api/messages/{recipient_id}", json={"body": "Привет!"}, headers=headers_sender)
    assert r.status_code == 200
    assert r.json()["body"] == "Привет!"
    assert r.json()["sender"]["display_name"] == "Отправитель"

    r = client.get(f"/api/messages/{recipient_id}", headers=headers_sender)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_thread_shows_messages_from_both_sides(client, register_user_with_id):
    headers_a, id_a = register_user_with_id("Ана")
    headers_b, id_b = register_user_with_id("Марко")

    client.post(f"/api/messages/{id_b}", json={"body": "Привет от Аны"}, headers=headers_a)
    client.post(f"/api/messages/{id_a}", json={"body": "Привет от Марко"}, headers=headers_b)

    r = client.get(f"/api/messages/{id_b}", headers=headers_a)
    bodies = [m["body"] for m in r.json()]
    assert bodies == ["Привет от Аны", "Привет от Марко"]


def test_opening_thread_marks_incoming_messages_read(client, register_user_with_id):
    headers_sender, sender_id = register_user_with_id()
    headers_recipient, recipient_id = register_user_with_id()

    client.post(f"/api/messages/{recipient_id}", json={"body": "Привет"}, headers=headers_sender)

    r = client.get("/api/messages/unread-count", headers=headers_recipient)
    assert r.json()["count"] == 1

    client.get(f"/api/messages/{sender_id}", headers=headers_recipient)

    r = client.get("/api/messages/unread-count", headers=headers_recipient)
    assert r.json()["count"] == 0


def test_conversations_list_shows_last_message_and_unread(client, register_user_with_id):
    headers_a, id_a = register_user_with_id("Ана")
    headers_b, id_b = register_user_with_id("Марко")

    client.post(f"/api/messages/{id_b}", json={"body": "Первое"}, headers=headers_a)
    client.post(f"/api/messages/{id_a}", json={"body": "Второе"}, headers=headers_b)

    r = client.get("/api/messages/conversations", headers=headers_a)
    assert r.status_code == 200
    conversations = r.json()
    assert len(conversations) == 1
    assert conversations[0]["partner"]["display_name"] == "Марко"
    assert conversations[0]["last_message"] == "Второе"
    assert conversations[0]["unread_count"] == 1


def test_conversations_list_one_row_per_partner_not_per_message(client, register_user_with_id):
    headers_a, id_a = register_user_with_id()
    headers_b, id_b = register_user_with_id()

    for i in range(5):
        client.post(f"/api/messages/{id_b}", json={"body": f"Сообщение {i}"}, headers=headers_a)

    r = client.get("/api/messages/conversations", headers=headers_a)
    assert len(r.json()) == 1


def test_cannot_message_self(client, register_user_with_id):
    headers, user_id = register_user_with_id()
    r = client.post(f"/api/messages/{user_id}", json={"body": "Привет себе"}, headers=headers)
    assert r.status_code == 400


def test_message_nonexistent_user_404(client, register_user):
    headers = register_user()
    r = client.post("/api/messages/does-not-exist", json={"body": "Привет"}, headers=headers)
    assert r.status_code == 404


def test_send_message_requires_auth(client, register_user_with_id):
    _, user_id = register_user_with_id()
    r = client.post(f"/api/messages/{user_id}", json={"body": "Привет"})
    assert r.status_code == 401


def test_blank_message_rejected(client, register_user_with_id):
    headers, _ = register_user_with_id()
    _, recipient_id = register_user_with_id()
    r = client.post(f"/api/messages/{recipient_id}", json={"body": "   "}, headers=headers)
    assert r.status_code in (400, 422)


def test_message_rate_limit(client, register_user_with_id):
    headers, _ = register_user_with_id()
    _, recipient_id = register_user_with_id()

    statuses = []
    for i in range(31):
        r = client.post(f"/api/messages/{recipient_id}", json={"body": f"Сообщение {i}"}, headers=headers)
        statuses.append(r.status_code)
    assert statuses.count(429) == 1
    assert statuses[-1] == 429


def test_third_party_cannot_read_thread_without_being_participant(client, register_user_with_id):
    """Пользователь C не должен видеть переписку A и B, запросив /messages/{B} со своим
    токеном — потому что get_thread возвращает только сообщения между *текущим* пользователем
    и user_id из пути, а не любую переписку с этим user_id."""
    headers_a, id_a = register_user_with_id()
    headers_b, id_b = register_user_with_id()
    headers_c, id_c = register_user_with_id()

    client.post(f"/api/messages/{id_b}", json={"body": "Секрет A и B"}, headers=headers_a)

    r = client.get(f"/api/messages/{id_b}", headers=headers_c)
    assert r.json() == []
