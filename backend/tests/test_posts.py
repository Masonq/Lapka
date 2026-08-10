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


def test_filter_posts_by_is_resolved(client, register_user):
    headers = register_user()
    active = client.post(
        "/api/posts", json={"type": "lost", "title": "Активная потеряшка", "body": "текст"}, headers=headers
    ).json()
    resolved = client.post(
        "/api/posts", json={"type": "lost", "title": "Уже нашёлся", "body": "текст"}, headers=headers
    ).json()
    client.patch(f"/api/posts/{resolved['id']}/resolve", headers=headers)

    r = client.get("/api/posts", params={"is_resolved": False})
    titles = [p["title"] for p in r.json()]
    assert "Активная потеряшка" in titles
    assert "Уже нашёлся" not in titles

    r = client.get("/api/posts", params={"is_resolved": True})
    titles = [p["title"] for p in r.json()]
    assert "Уже нашёлся" in titles
    assert "Активная потеряшка" not in titles


def test_local_pulse_counts_active_lost_found(client, register_user):
    headers = register_user()
    client.post("/api/posts", json={"type": "lost", "title": "Потеряшка 1", "body": "текст"}, headers=headers)
    client.post("/api/posts", json={"type": "lost", "title": "Потеряшка 2", "body": "текст"}, headers=headers)
    found_resolved = client.post(
        "/api/posts", json={"type": "found", "title": "Найден и вернули", "body": "текст"}, headers=headers
    ).json()
    client.patch(f"/api/posts/{found_resolved['id']}/resolve", headers=headers)

    r = client.get("/api/posts/local-pulse")
    assert r.status_code == 200
    data = r.json()
    assert data["active_lost_count"] == 2
    assert data["active_found_count"] == 0  # решённый не считается активным


def test_local_pulse_counts_upcoming_events(client, register_user):
    headers = register_user()
    client.post(
        "/api/events", json={"type": "walk", "title": "Прогулка", "starts_at": "2027-01-01T18:00:00Z"}, headers=headers
    )

    r = client.get("/api/posts/local-pulse")
    assert r.json()["upcoming_events_count"] >= 1


def test_local_pulse_no_auth_required(client):
    r = client.get("/api/posts/local-pulse")
    assert r.status_code == 200


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


def test_list_comments_query_count_does_not_scale_with_result_size(client, register_user):
    """Тот же класс N+1 — comment.author через ленивую связь давал отдельный
    запрос на каждый комментарий, не подгружался вместе со списком."""
    from app.core.db import engine
    from sqlalchemy import event as sa_event

    headers_author = register_user("Автор")
    post = client.post(
        "/api/posts", json={"type": "question", "title": "Вопрос", "body": "текст"}, headers=headers_author
    ).json()

    for i in range(4):
        headers_commenter = register_user(f"Комментатор{i}")
        client.post(f"/api/posts/{post['id']}/comments", json={"body": f"Ответ {i}"}, headers=headers_commenter)

    query_count = 0

    def count_queries(*args, **kwargs):
        nonlocal query_count
        query_count += 1

    sa_event.listen(engine, "before_cursor_execute", count_queries)
    try:
        r = client.get(f"/api/posts/{post['id']}/comments")
    finally:
        sa_event.remove(engine, "before_cursor_execute", count_queries)

    assert len(r.json()) == 4
    # 1 запрос комментариев (с joinedload author) — без отдельных запросов на каждый
    assert query_count <= 1


def test_post_author_is_staff_reflects_moderator_role(client, register_with_role, register_user):
    headers_mod, _ = register_with_role("moderator", "Модератор Постов")
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Объявление от модерации", "body": "Текст"}, headers=headers_mod
    ).json()
    assert post["author"]["is_staff"] is True

    headers_regular = register_user("Обычный")
    post2 = client.post(
        "/api/posts", json={"type": "general", "title": "Обычный пост", "body": "Текст"}, headers=headers_regular
    ).json()
    assert post2["author"]["is_staff"] is False


def test_post_author_is_staff_reflects_admin(client, register_admin):
    headers_admin, _ = register_admin()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "От админа", "body": "Текст"}, headers=headers_admin
    ).json()
    assert post["author"]["is_staff"] is True


def test_post_author_is_staff_reflects_editor(client, register_with_role):
    headers_editor, _ = register_with_role("editor", "Редактор")
    post = client.post(
        "/api/posts", json={"type": "general", "title": "От редактора", "body": "Текст"}, headers=headers_editor
    ).json()
    assert post["author"]["is_staff"] is True


def test_show_staff_badge_defaults_true(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "Тело"}, headers=headers
    ).json()
    assert post["show_staff_badge"] is True


def test_show_staff_badge_can_be_hidden(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts",
        json={"type": "general", "title": "Тест", "body": "Тело", "show_staff_badge": False},
        headers=headers,
    ).json()
    assert post["show_staff_badge"] is False

    r = client.get(f"/api/posts/{post['id']}")
    assert r.json()["show_staff_badge"] is False


def test_edit_own_post(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Старый заголовок", "body": "Старый текст"}, headers=headers
    ).json()

    r = client.patch(f"/api/posts/{post['id']}", json={"title": "Новый заголовок"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["title"] == "Новый заголовок"
    assert r.json()["body"] == "Старый текст"  # не тронуто, т.к. не передавали


def test_cannot_edit_others_post(client, register_user):
    headers_a = register_user("Автор")
    headers_b = register_user("Чужой")
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "Тело"}, headers=headers_a
    ).json()

    r = client.patch(f"/api/posts/{post['id']}", json={"title": "Взлом"}, headers=headers_b)
    assert r.status_code == 403


def test_edit_post_empty_title_rejected(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "Тело"}, headers=headers
    ).json()

    r = client.patch(f"/api/posts/{post['id']}", json={"title": "   "}, headers=headers)
    assert r.status_code == 400


def test_edit_nonexistent_post_404(client, register_user):
    headers = register_user()
    r = client.patch("/api/posts/does-not-exist", json={"title": "X"}, headers=headers)
    assert r.status_code == 404


def test_edit_post_requires_auth(client):
    r = client.patch("/api/posts/some-id", json={"title": "X"})
    assert r.status_code == 401


def test_create_post_with_coordinates(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/posts",
        json={
            "type": "lost", "title": "Тест", "body": "Текст",
            "last_seen_lat": 44.8125, "last_seen_lng": 20.4612,
        },
        headers=headers,
    )
    assert r.status_code == 200
    post = r.json()
    assert post["last_seen_lat"] == 44.8125
    assert post["last_seen_lng"] == 20.4612


def test_create_post_without_coordinates_stays_null(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "Текст"}, headers=headers
    )
    post = r.json()
    assert post["last_seen_lat"] is None
    assert post["last_seen_lng"] is None


def test_post_not_found_error_translated_to_serbian(client):
    r = client.get("/api/posts/nonexistent-id", headers={"X-Lang": "sr"})
    assert r.status_code == 404
    assert r.json()["detail"] == "Objava nije pronađena"


def test_post_not_found_error_default_russian(client):
    r = client.get("/api/posts/nonexistent-id")
    assert r.status_code == 404
    assert r.json()["detail"] == "Пост не найден"


def test_edit_other_users_post_error_translated_to_serbian(client, register_user):
    headers_author = register_user("Автор")
    headers_other = register_user("Другой")
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "Текст"}, headers=headers_author
    ).json()

    r = client.patch(
        f"/api/posts/{post['id']}", json={"title": "Новый заголовок"},
        headers={**headers_other, "X-Lang": "sr"},
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "Možeš izmeniti samo svoju objavu"


def test_empty_comment_error_translated_to_serbian(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "Текст"}, headers=headers
    ).json()

    r = client.post(
        f"/api/posts/{post['id']}/comments", json={"body": "   "},
        headers={**headers, "X-Lang": "sr"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "Komentar ne može biti prazan"
