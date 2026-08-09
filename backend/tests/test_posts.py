def test_create_and_get_post(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/posts",
        json={"type": "lost", "title": "Бела пропала", "body": "у Ташмайдана"},
        headers=headers,
    )
    assert r.status_code == 200
    post = r.json()
    assert post["title"] == "Бела пропала"
    assert post["is_resolved"] is False

    r = client.get(f"/api/posts/{post['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == post["id"]


def test_get_nonexistent_post_404(client):
    r = client.get("/api/posts/does-not-exist")
    assert r.status_code == 404


def test_unknown_post_type_rejected(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/posts",
        json={"type": "not-a-real-type", "title": "Тест", "body": "текст"},
        headers=headers,
    )
    assert r.status_code == 400


def test_blank_title_rejected(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/posts",
        json={"type": "general", "title": "   ", "body": "текст"},
        headers=headers,
    )
    assert r.status_code == 400


def test_filter_by_type(client, register_user):
    headers = register_user()
    client.post("/api/posts", json={"type": "lost", "title": "Потеряшка", "body": "текст"}, headers=headers)
    client.post("/api/posts", json={"type": "adopt", "title": "Пристройство", "body": "текст"}, headers=headers)

    r = client.get("/api/posts", params={"type": "lost"})
    titles = [p["title"] for p in r.json()]
    assert "Потеряшка" in titles
    assert "Пристройство" not in titles


def test_search_finds_by_title_and_body(client, register_user):
    headers = register_user()
    client.post(
        "/api/posts",
        json={"type": "lost", "title": "Бела пропала", "body": "вест-хайленд-терьер"},
        headers=headers,
    )
    client.post(
        "/api/posts",
        json={"type": "adopt", "title": "Котята", "body": "ищут дом"},
        headers=headers,
    )

    r = client.get("/api/posts", params={"q": "терьер"})
    titles = [p["title"] for p in r.json()]
    assert titles == ["Бела пропала"]

    r = client.get("/api/posts", params={"q": "котят"})
    titles = [p["title"] for p in r.json()]
    assert titles == ["Котята"]

    r = client.get("/api/posts", params={"q": "не найдётся никогда"})
    assert r.json() == []


def test_pagination_offset_and_limit(client, register_user):
    headers = register_user()
    for i in range(5):
        client.post("/api/posts", json={"type": "general", "title": f"Пост {i}", "body": "текст"}, headers=headers)

    page1 = client.get("/api/posts", params={"limit": 3, "offset": 0}).json()
    page2 = client.get("/api/posts", params={"limit": 3, "offset": 3}).json()

    assert len(page1) == 3
    assert len(page2) == 2
    assert {p["id"] for p in page1}.isdisjoint({p["id"] for p in page2})


def test_limit_capped_at_100(client):
    r = client.get("/api/posts", params={"limit": 9999})
    assert r.status_code == 422  # превышает le=100 в схеме параметра


def test_resolve_post_only_by_author(client, register_user):
    headers_author = register_user()
    headers_other = register_user()

    post = client.post(
        "/api/posts", json={"type": "lost", "title": "Тест", "body": "текст"}, headers=headers_author
    ).json()

    r = client.patch(f"/api/posts/{post['id']}/resolve", headers=headers_other)
    assert r.status_code == 403

    r = client.patch(f"/api/posts/{post['id']}/resolve", headers=headers_author)
    assert r.status_code == 200
    assert r.json()["is_resolved"] is True


def test_delete_post_only_by_author(client, register_user):
    headers_author = register_user()
    headers_other = register_user()

    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers_author
    ).json()

    r = client.delete(f"/api/posts/{post['id']}", headers=headers_other)
    assert r.status_code == 403

    r = client.delete(f"/api/posts/{post['id']}", headers=headers_author)
    assert r.status_code == 200

    r = client.get(f"/api/posts/{post['id']}")
    assert r.status_code == 404


def test_post_rate_limit(client, register_user):
    headers = register_user()
    statuses = []
    for i in range(6):
        r = client.post(
            "/api/posts", json={"type": "general", "title": f"Пост {i}", "body": "текст"}, headers=headers
        )
        statuses.append(r.status_code)

    assert statuses == [200, 200, 200, 200, 200, 429]


def test_comments_flow(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "question", "title": "Вопрос", "body": "текст"}, headers=headers
    ).json()

    r = client.post(f"/api/posts/{post['id']}/comments", json={"body": "Ответ"}, headers=headers)
    assert r.status_code == 200

    r = client.get(f"/api/posts/{post['id']}/comments")
    assert len(r.json()) == 1
    assert r.json()[0]["body"] == "Ответ"


def test_blank_comment_rejected(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "question", "title": "Вопрос", "body": "текст"}, headers=headers
    ).json()

    r = client.post(f"/api/posts/{post['id']}/comments", json={"body": "   "}, headers=headers)
    assert r.status_code == 400


def test_title_too_long_rejected_cleanly(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/posts",
        json={"type": "general", "title": "а" * 201, "body": "текст"},
        headers=headers,
    )
    assert r.status_code == 422  # чистая ошибка валидации, а не 500 от переполнения колонки БД


def test_location_too_long_rejected_cleanly(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/posts",
        json={"type": "lost", "title": "Тест", "body": "текст", "last_seen_location": "а" * 201},
        headers=headers,
    )
    assert r.status_code == 422


def test_following_feed_requires_auth(client):
    r = client.get("/api/posts", params={"following": True})
    assert r.status_code == 401


def test_following_feed_shows_only_followed_authors(client, register_user, register_user_with_id):
    headers_viewer, viewer_id = register_user_with_id()
    headers_followed, followed_id = register_user_with_id()
    headers_stranger = register_user()

    client.post(
        "/api/posts", json={"type": "general", "title": "От подписки", "body": "текст"}, headers=headers_followed
    )
    client.post(
        "/api/posts", json={"type": "general", "title": "От незнакомца", "body": "текст"}, headers=headers_stranger
    )

    client.post(f"/api/follows/{followed_id}", headers=headers_viewer)

    r = client.get("/api/posts", params={"following": True}, headers=headers_viewer)
    assert r.status_code == 200
    titles = [p["title"] for p in r.json()]
    assert titles == ["От подписки"]


def test_following_feed_empty_when_no_subscriptions(client, register_user):
    headers = register_user()
    r = client.get("/api/posts", params={"following": True}, headers=headers)
    assert r.status_code == 200
    assert r.json() == []


def test_delete_post_cascades_saved_reports_comments(client, register_user):
    """Раньше это падало 500-й ошибкой на реальном Postgres (FK-нарушение) — SQLite без
    PRAGMA foreign_keys=ON эту проблему не видел. Теперь FK проверяются и в тестах, и на
    всех связанных таблицах стоит ondelete=CASCADE."""
    headers_author = register_user()
    headers_other = register_user()

    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers_author
    ).json()

    client.post(f"/api/posts/{post['id']}/save", headers=headers_other)
    client.post(f"/api/posts/{post['id']}/report", json={"reason": "тест"}, headers=headers_other)
    client.post(f"/api/posts/{post['id']}/comments", json={"body": "коммент"}, headers=headers_other)

    r = client.delete(f"/api/posts/{post['id']}", headers=headers_author)
    assert r.status_code == 200

    r = client.get(f"/api/posts/{post['id']}")
    assert r.status_code == 404


def test_comment_on_nonexistent_post_404(client, register_user):
    headers = register_user()
    r = client.post("/api/posts/does-not-exist/comments", json={"body": "текст"}, headers=headers)
    assert r.status_code == 404


def test_list_posts_query_count_does_not_scale_with_result_size(client, register_user):
    """Раньше на каждый пост уходило по одному запросу за автором (ленивая связь) и
    по одному за подсчётом комментариев (len(post.comments)) — 11 запросов на 5 постов
    от разных авторов. Самый нагруженный эндпоинт всего приложения (лента), поэтому
    важнее всего, чтобы число запросов не росло вместе с числом постов."""
    from app.core.db import engine
    from sqlalchemy import event as sa_event

    for i in range(5):
        headers = register_user(f"Автор{i}")
        client.post("/api/posts", json={"type": "general", "title": f"Пост {i}", "body": "текст"}, headers=headers)

    query_count = 0

    def count_queries(*args, **kwargs):
        nonlocal query_count
        query_count += 1

    sa_event.listen(engine, "before_cursor_execute", count_queries)
    try:
        r = client.get("/api/posts")
    finally:
        sa_event.remove(engine, "before_cursor_execute", count_queries)

    assert len(r.json()) == 5
    # 1 запрос постов (с joinedload автора — без отдельных запросов) + 1 батч комментариев.
    # Без авторизации get_current_user_optional не трогает базу вовсе, если токена нет
    assert query_count <= 3
