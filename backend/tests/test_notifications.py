def test_follow_creates_notification(client, register_user, register_user_with_id):
    headers_follower = register_user("Подписчик")
    headers_followed, followed_id = register_user_with_id("Автор")

    client.post(f"/api/follows/{followed_id}", headers=headers_follower)

    r = client.get("/api/notifications", headers=headers_followed)
    assert r.status_code == 200
    notifications = r.json()
    assert len(notifications) == 1
    assert notifications[0]["type"] == "follow"
    assert notifications[0]["actor"]["display_name"] == "Подписчик"
    assert notifications[0]["is_read"] is False


def test_repeated_follow_does_not_duplicate_notification(client, register_user, register_user_with_id):
    headers_follower = register_user()
    headers_followed, followed_id = register_user_with_id()

    client.post(f"/api/follows/{followed_id}", headers=headers_follower)
    client.post(f"/api/follows/{followed_id}", headers=headers_follower)  # повторно — идемпотентно

    r = client.get("/api/notifications", headers=headers_followed)
    assert len(r.json()) == 1


def test_comment_creates_notification_for_post_author(client, register_user):
    headers_author = register_user("Автор")
    headers_commenter = register_user("Комментатор")

    post = client.post(
        "/api/posts", json={"type": "question", "title": "Вопрос", "body": "текст"}, headers=headers_author
    ).json()
    client.post(f"/api/posts/{post['id']}/comments", json={"body": "Ответ"}, headers=headers_commenter)

    r = client.get("/api/notifications", headers=headers_author)
    notifications = r.json()
    assert len(notifications) == 1
    assert notifications[0]["type"] == "comment"
    assert notifications[0]["actor"]["display_name"] == "Комментатор"
    assert notifications[0]["post_title"] == "Вопрос"


def test_commenting_on_own_post_does_not_notify_self(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers
    ).json()
    client.post(f"/api/posts/{post['id']}/comments", json={"body": "Сам себе"}, headers=headers)

    r = client.get("/api/notifications", headers=headers)
    assert r.json() == []


def test_notifications_require_auth(client):
    r = client.get("/api/notifications")
    assert r.status_code == 401


def test_unread_count(client, register_user, register_user_with_id):
    headers_follower = register_user()
    headers_followed, followed_id = register_user_with_id()

    client.post(f"/api/follows/{followed_id}", headers=headers_follower)

    r = client.get("/api/notifications/unread-count", headers=headers_followed)
    assert r.json()["count"] == 1


def test_mark_all_read(client, register_user, register_user_with_id):
    headers_follower = register_user()
    headers_followed, followed_id = register_user_with_id()

    client.post(f"/api/follows/{followed_id}", headers=headers_follower)

    r = client.patch("/api/notifications/read-all", headers=headers_followed)
    assert r.status_code == 200

    r = client.get("/api/notifications/unread-count", headers=headers_followed)
    assert r.json()["count"] == 0

    r = client.get("/api/notifications", headers=headers_followed)
    assert all(n["is_read"] for n in r.json())


def test_mark_single_read_only_by_owner(client, register_user, register_user_with_id):
    headers_follower = register_user()
    headers_followed, followed_id = register_user_with_id()
    headers_stranger = register_user()

    client.post(f"/api/follows/{followed_id}", headers=headers_follower)
    notification_id = client.get("/api/notifications", headers=headers_followed).json()[0]["id"]

    r = client.patch(f"/api/notifications/{notification_id}/read", headers=headers_stranger)
    assert r.status_code == 403

    r = client.patch(f"/api/notifications/{notification_id}/read", headers=headers_followed)
    assert r.status_code == 200
