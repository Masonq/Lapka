def test_follow_creates_notification(client, register_user, register_user_with_id):
    headers_follower = register_user("Подписчик")
    headers_followed, followed_id = register_user_with_id("Автор")

    client.post(f"/api/follows/{followed_id}", headers=headers_follower)

    r = client.get("/api/notifications", headers=headers_followed)
    assert r.status_code == 200
    notifications = r.json()
    assert len(notifications) == 2  # welcome при регистрации + follow
    assert notifications[0]["type"] == "follow"  # самое свежее — первое
    assert notifications[0]["actor"]["display_name"] == "Подписчик"
    assert notifications[0]["is_read"] is False


def test_repeated_follow_does_not_duplicate_notification(client, register_user, register_user_with_id):
    headers_follower = register_user()
    headers_followed, followed_id = register_user_with_id()

    client.post(f"/api/follows/{followed_id}", headers=headers_follower)
    client.post(f"/api/follows/{followed_id}", headers=headers_follower)  # повторно — идемпотентно

    r = client.get("/api/notifications", headers=headers_followed)
    assert len(r.json()) == 2  # welcome + follow (не задублировался повторной подпиской)


def test_comment_creates_notification_for_post_author(client, register_user):
    headers_author = register_user("Автор")
    headers_commenter = register_user("Комментатор")

    post = client.post(
        "/api/posts", json={"type": "question", "title": "Вопрос", "body": "текст"}, headers=headers_author
    ).json()
    client.post(f"/api/posts/{post['id']}/comments", json={"body": "Ответ"}, headers=headers_commenter)

    r = client.get("/api/notifications", headers=headers_author)
    notifications = r.json()
    assert len(notifications) == 2  # welcome + comment
    assert notifications[0]["type"] == "comment"  # самое свежее — первое
    assert notifications[0]["actor"]["display_name"] == "Комментатор"
    assert notifications[0]["post_title"] == "Вопрос"


def test_commenting_on_own_post_does_not_notify_self(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers
    ).json()
    client.post(f"/api/posts/{post['id']}/comments", json={"body": "Сам себе"}, headers=headers)

    r = client.get("/api/notifications", headers=headers)
    notifications = r.json()
    assert len(notifications) == 1  # только welcome, комментарий к своему посту не добавил comment-уведомление
    assert notifications[0]["type"] == "welcome"


def test_notifications_require_auth(client):
    r = client.get("/api/notifications")
    assert r.status_code == 401


def test_unread_count(client, register_user, register_user_with_id):
    headers_follower = register_user()
    headers_followed, followed_id = register_user_with_id()

    client.post(f"/api/follows/{followed_id}", headers=headers_follower)

    r = client.get("/api/notifications/unread-count", headers=headers_followed)
    assert r.json()["count"] == 2  # welcome при регистрации + follow


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


def test_list_notifications_query_count_does_not_scale_with_result_size(client, register_user_with_id, register_user):
    """Тот же класс N+1 — notification.actor и notification.post через ленивую связь
    давали отдельные запросы на каждое уведомление (до 2N лишних запросов), не
    подгружались вместе со списком."""
    from app.core.db import engine
    from sqlalchemy import event as sa_event

    headers_author, author_id = register_user_with_id("Автор")

    # follow-уведомления (без поста)
    for i in range(2):
        headers_follower = register_user(f"Подписчик{i}")
        client.post(f"/api/follows/{author_id}", headers=headers_follower)

    # comment-уведомления (с постом)
    post = client.post(
        "/api/posts", json={"type": "question", "title": "Вопрос", "body": "текст"}, headers=headers_author
    ).json()
    for i in range(2):
        headers_commenter = register_user(f"Комментатор{i}")
        client.post(f"/api/posts/{post['id']}/comments", json={"body": f"Ответ {i}"}, headers=headers_commenter)

    query_count = 0

    def count_queries(*args, **kwargs):
        nonlocal query_count
        query_count += 1

    sa_event.listen(engine, "before_cursor_execute", count_queries)
    try:
        r = client.get("/api/notifications", headers=headers_author)
    finally:
        sa_event.remove(engine, "before_cursor_execute", count_queries)

    assert len(r.json()) == 5  # welcome + 2 follow + 2 comment
    # 1 запрос уведомлений (с joinedload actor+post) + сама авторизация — небольшая
    # константа, не растёт с числом уведомлений
    assert query_count <= 3


def test_not_your_notification_error_translated_to_serbian(client, register_user):
    headers_a = register_user("Пользователь А")
    headers_b = register_user("Пользователь Б")

    # уведомление появится у А, если Б на него подпишется
    a_id = client.get("/api/auth/me", headers=headers_a).json()["id"]
    client.post(f"/api/follows/{a_id}", headers=headers_b)

    notif = client.get("/api/notifications", headers=headers_a).json()[0]

    r = client.patch(
        f"/api/notifications/{notif['id']}/read", headers={**headers_b, "X-Lang": "sr"}
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "Ovo nije tvoje obaveštenje"
