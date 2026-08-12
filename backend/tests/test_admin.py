def test_admin_endpoints_require_admin_flag(client, register_user):
    headers = register_user()
    r = client.get("/api/admin/overview", headers=headers)
    assert r.status_code == 403


def test_admin_endpoints_require_auth(client):
    r = client.get("/api/admin/overview")
    assert r.status_code == 401


def test_admin_overview(client, register_admin):
    headers_admin, _ = register_admin()

    client.post("/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers_admin)

    r = client.get("/api/admin/overview", headers=headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert data["users_count"] == 1
    assert data["posts_count"] == 1


def test_admin_sees_reports_queue(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    headers_author = register_user()
    headers_reporter = register_user()

    post = client.post(
        "/api/posts", json={"type": "general", "title": "Подозрительный пост", "body": "текст"}, headers=headers_author
    ).json()
    client.post(f"/api/posts/{post['id']}/report", json={"reason": "Спам"}, headers=headers_reporter)

    r = client.get("/api/admin/reports", headers=headers_admin)
    assert r.status_code == 200
    reports = r.json()
    assert len(reports) == 1
    assert reports[0]["reason"] == "Спам"
    assert reports[0]["post"]["title"] == "Подозрительный пост"
    assert reports[0]["is_resolved"] is False


def test_admin_dismiss_report(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    headers_author = register_user()
    headers_reporter = register_user()

    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers_author
    ).json()
    client.post(f"/api/posts/{post['id']}/report", json={}, headers=headers_reporter)

    reports = client.get("/api/admin/reports", headers=headers_admin).json()
    report_id = reports[0]["id"]

    r = client.patch(f"/api/admin/reports/{report_id}/dismiss", headers=headers_admin)
    assert r.status_code == 200

    r = client.get("/api/admin/reports", params={"resolved": False}, headers=headers_admin)
    assert r.json() == []


def test_admin_can_delete_any_post(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    headers_author = register_user()

    post = client.post(
        "/api/posts", json={"type": "general", "title": "Плохой пост", "body": "текст"}, headers=headers_author
    ).json()

    r = client.delete(f"/api/admin/posts/{post['id']}", headers=headers_admin)
    assert r.status_code == 200

    r = client.get(f"/api/posts/{post['id']}")
    assert r.status_code == 404


def test_deleting_post_resolves_its_open_reports(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    headers_author = register_user()
    headers_reporter = register_user()

    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers_author
    ).json()
    client.post(f"/api/posts/{post['id']}/report", json={}, headers=headers_reporter)

    client.delete(f"/api/admin/posts/{post['id']}", headers=headers_admin)

    r = client.get("/api/admin/reports", headers=headers_admin)
    reports = r.json()
    assert len(reports) == 1
    assert reports[0]["is_resolved"] is True
    assert reports[0]["post"] is None  # пост удалён, но жалоба осталась для журнала


def test_ordinary_user_cannot_delete_others_post_via_admin_endpoint(client, register_user):
    headers_stranger = register_user()
    headers_author = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers_author
    ).json()

    r = client.delete(f"/api/admin/posts/{post['id']}", headers=headers_stranger)
    assert r.status_code == 403


def test_audit_log_records_admin_actions(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    headers_author = register_user()

    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers_author
    ).json()
    client.delete(f"/api/admin/posts/{post['id']}", headers=headers_admin)

    r = client.get("/api/admin/audit-log", headers=headers_admin)
    assert r.status_code == 200
    entries = r.json()
    assert len(entries) == 1
    assert entries[0]["action"] == "delete_post"
    assert entries[0]["admin"]["display_name"] == "Админ"


def test_audit_log_pagination(client, register_user_with_id, register_admin):
    headers_admin, _ = register_admin()
    _, target_id = register_user_with_id()

    # 5 действий подряд над одним пользователем — 5 записей в журнале,
    # каждая с разной ролью, чтобы отличать их друг от друга по порядку
    roles = ["moderator", "user", "editor", "user", "moderator"]
    for role in roles:
        client.patch(f"/api/admin/users/{target_id}/role", json={"role": role}, headers=headers_admin)

    # Первая страница — 2 самые свежие записи (limit=2, offset=0)
    page1 = client.get("/api/admin/audit-log?limit=2&offset=0", headers=headers_admin).json()
    assert len(page1) == 2
    assert [e["note"] for e in page1] == ["moderator", "user"]  # порядок new->old, последние 2 действия

    # Вторая страница — следующие 2 записи, без пересечения с первой
    page2 = client.get("/api/admin/audit-log?limit=2&offset=2", headers=headers_admin).json()
    assert len(page2) == 2
    assert [e["note"] for e in page2] == ["editor", "user"]
    assert {e["id"] for e in page1}.isdisjoint({e["id"] for e in page2})

    # Третья страница — последняя оставшаяся запись
    page3 = client.get("/api/admin/audit-log?limit=2&offset=4", headers=headers_admin).json()
    assert len(page3) == 1
    assert page3[0]["note"] == "moderator"


def test_admin_list_stories_shows_only_active(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    headers_author = register_user()

    story = client.post(
        "/api/stories", json={"photo_url": "/uploads/test.jpg"}, headers=headers_author
    ).json()

    r = client.get("/api/admin/stories", headers=headers_admin)
    assert r.status_code == 200
    stories = r.json()
    assert len(stories) == 1
    assert stories[0]["id"] == story["id"]


def test_admin_list_stories_requires_moderator(client, register_user):
    headers = register_user()
    r = client.get("/api/admin/stories", headers=headers)
    assert r.status_code == 403


def test_admin_delete_story(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    headers_author = register_user()

    story = client.post(
        "/api/stories", json={"photo_url": "/uploads/test.jpg"}, headers=headers_author
    ).json()

    r = client.delete(f"/api/admin/stories/{story['id']}", headers=headers_admin)
    assert r.status_code == 200

    # После удаления история больше не появляется в списке (ни у админа, ни в
    # обычной ленте историй — здесь проверяем именно admin-список)
    remaining = client.get("/api/admin/stories", headers=headers_admin).json()
    assert remaining == []

    # Журнал действий записал удаление
    log = client.get("/api/admin/audit-log", headers=headers_admin).json()
    assert log[0]["action"] == "delete_story"


def test_admin_can_ban_user(client, register_user_with_id, register_admin):
    headers_admin, _ = register_admin()
    headers_target, target_id = register_user_with_id()

    r = client.patch(
        f"/api/admin/users/{target_id}/ban", json={"banned": True, "reason": "Спам"}, headers=headers_admin
    )
    assert r.status_code == 200
    body = r.json()
    assert body["is_banned"] is True
    assert body["ban_reason"] == "Спам"

    # Журнал действий записал бан с причиной
    log = client.get("/api/admin/audit-log", headers=headers_admin).json()
    assert log[0]["action"] == "ban_user"
    assert log[0]["note"] == "Спам"


def test_banned_user_cannot_login(client, register_user_with_id, register_admin):
    """Бан должен блокировать сразу на входе — не просто на следующем запросе
    после успешного логина (плохой UX иначе)."""
    headers_admin, _ = register_admin()
    headers_target, target_id = register_user_with_id(password="password123")

    # Узнаём email забаненного пользователя через admin-список (у /auth/me
    # в схеме MeOut email не возвращается вообще)
    target_before_ban = next(
        u for u in client.get("/api/admin/users", headers=headers_admin).json() if u["id"] == target_id
    )
    email = target_before_ban["email"]

    client.patch(f"/api/admin/users/{target_id}/ban", json={"banned": True}, headers=headers_admin)

    r = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert r.status_code == 403
    assert "заблокирован" in r.json()["detail"].lower()


def test_banned_user_loses_access_immediately_with_existing_token(client, register_user_with_id, register_admin):
    """Ключевая проверка дизайна: токен, выданный ДО бана, должен перестать
    работать сразу после бана — не только новый вход должен быть заблокирован.
    JWT сам по себе stateless (нет блэклиста токенов), эффект достигается
    проверкой is_banned в get_current_user на каждый запрос."""
    headers_admin, _ = register_admin()
    headers_target, target_id = register_user_with_id()

    # Токен уже на руках, работает нормально до бана
    r = client.get("/api/auth/me", headers=headers_target)
    assert r.status_code == 200

    client.patch(f"/api/admin/users/{target_id}/ban", json={"banned": True, "reason": "Нарушение правил"}, headers=headers_admin)

    # Тот же самый, уже выданный токен — теперь отклоняется
    r = client.get("/api/auth/me", headers=headers_target)
    assert r.status_code == 403
    assert "Нарушение правил" in r.json()["detail"]


def test_banned_user_treated_as_guest_in_optional_auth(client, register_user_with_id, register_admin):
    """get_current_user_optional не должен ломать публичные эндпоинты для
    забаненного — он должен просто выглядеть неавторизованным (None),
    не получать 403 там, где авторизация не обязательна."""
    headers_admin, _ = register_admin()
    headers_target, target_id = register_user_with_id()

    client.patch(f"/api/admin/users/{target_id}/ban", json={"banned": True}, headers=headers_admin)

    # Лента постов доступна без авторизации — с токеном забаненного она
    # должна вести себя так же, как без токена вообще (не 403)
    r = client.get("/api/posts", headers=headers_target)
    assert r.status_code == 200


def test_admin_can_unban_user(client, register_user_with_id, register_admin):
    headers_admin, _ = register_admin()
    headers_target, target_id = register_user_with_id()

    client.patch(f"/api/admin/users/{target_id}/ban", json={"banned": True, "reason": "Тест"}, headers=headers_admin)
    r = client.get("/api/auth/me", headers=headers_target)
    assert r.status_code == 403

    unban = client.patch(f"/api/admin/users/{target_id}/ban", json={"banned": False}, headers=headers_admin)
    assert unban.status_code == 200
    assert unban.json()["is_banned"] is False
    assert unban.json()["ban_reason"] is None

    # Доступ восстановлен тем же самым токеном
    r = client.get("/api/auth/me", headers=headers_target)
    assert r.status_code == 200

    log = client.get("/api/admin/audit-log", headers=headers_admin).json()
    assert log[0]["action"] == "unban_user"


def test_cannot_ban_admin(client, register_admin):
    headers_admin1, _ = register_admin(display_name="Админ 1")
    headers_admin2, admin2_id = register_admin(display_name="Админ 2")

    r = client.patch(f"/api/admin/users/{admin2_id}/ban", json={"banned": True}, headers=headers_admin1)
    assert r.status_code == 400


def test_moderator_cannot_ban_users(client, register_user_with_id, register_admin):
    """Бан — строго для is_admin, как и смена роли. Модератор не должен мочь
    заблокировать кого угодно в обход иерархии."""
    headers_admin, admin_id = register_admin()
    headers_target, target_id = register_user_with_id()

    client.patch(f"/api/admin/users/{target_id}/role", json={"role": "moderator"}, headers=headers_admin)
    headers_moderator = headers_target  # у target_id теперь роль moderator

    r = client.patch(f"/api/admin/users/{admin_id}/ban", json={"banned": True}, headers=headers_moderator)
    assert r.status_code == 403


def test_list_reports_query_count_does_not_scale_with_result_size(client, register_user, register_admin):
    """Тот же класс N+1, что уже находил в posts.py/communities.py/events.py/messages.py/
    services.py — reporter/post через ленивую связь плюс len(post.comments) в цикле."""
    from app.core.db import engine
    from sqlalchemy import event as sa_event

    headers_admin, _ = register_admin()
    headers_author = register_user()
    for i in range(3):
        headers_reporter = register_user()
        post = client.post(
            "/api/posts", json={"type": "general", "title": f"Пост {i}", "body": "текст"}, headers=headers_author
        ).json()
        client.post(f"/api/posts/{post['id']}/report", json={"reason": "тест"}, headers=headers_reporter)

    query_count = 0

    def count_queries(*args, **kwargs):
        nonlocal query_count
        query_count += 1

    sa_event.listen(engine, "before_cursor_execute", count_queries)
    try:
        r = client.get("/api/admin/reports", headers=headers_admin)
    finally:
        sa_event.remove(engine, "before_cursor_execute", count_queries)

    assert len(r.json()) == 3
    # 1 запрос жалоб (с joinedload reporter+post) + 1 батч комментариев + 1 на авторизацию
    # админа (get_current_admin тоже обращается к базе) — константа, не растёт с числом жалоб
    assert query_count <= 4


def test_admin_can_verify_provider(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    headers_provider = register_user()
    client.post(
        "/api/services", json={"service_type": "sitter", "description": "Выгул собак"}, headers=headers_provider
    )

    r = client.get("/api/admin/service-providers", headers=headers_admin)
    assert r.status_code == 200
    provider_id = r.json()[0]["id"]
    assert r.json()[0]["is_verified"] is False

    r = client.patch(f"/api/admin/service-providers/{provider_id}/verify", headers=headers_admin)
    assert r.status_code == 200
    assert r.json()["is_verified"] is True

    # публичный список услуг тоже отражает верификацию
    r = client.get("/api/services")
    assert r.json()[0]["is_verified"] is True


def test_verify_provider_toggles_back(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    headers_provider = register_user()
    client.post(
        "/api/services", json={"service_type": "vet", "description": "Ветеринар"}, headers=headers_provider
    )
    provider_id = client.get("/api/admin/service-providers", headers=headers_admin).json()[0]["id"]

    client.patch(f"/api/admin/service-providers/{provider_id}/verify", headers=headers_admin)
    r = client.patch(f"/api/admin/service-providers/{provider_id}/verify", headers=headers_admin)
    assert r.json()["is_verified"] is False


def test_verify_provider_requires_admin(client, register_user):
    headers = register_user()
    client.post("/api/services", json={"service_type": "vet", "description": "Ветеринар"}, headers=headers)
    r = client.patch("/api/admin/service-providers/does-not-exist/verify", headers=headers)
    assert r.status_code == 403


def test_verify_nonexistent_provider_404(client, register_admin):
    headers_admin, _ = register_admin()
    r = client.patch("/api/admin/service-providers/does-not-exist/verify", headers=headers_admin)
    assert r.status_code == 404


def test_verify_provider_writes_audit_log(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    headers_provider = register_user()
    client.post(
        "/api/services", json={"service_type": "groomer", "description": "Грумер"}, headers=headers_provider
    )
    provider_id = client.get("/api/admin/service-providers", headers=headers_admin).json()[0]["id"]

    client.patch(f"/api/admin/service-providers/{provider_id}/verify", headers=headers_admin)

    r = client.get("/api/admin/audit-log", headers=headers_admin)
    entries = r.json()
    assert any(e["action"] == "verify_provider" for e in entries)


def test_admin_list_users_query_count_does_not_scale_with_result_size(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    for i in range(4):
        register_user(f"Пользователь{i}")

    from app.core.db import engine
    from sqlalchemy import event as sa_event

    query_count = 0

    def count_queries(*args, **kwargs):
        nonlocal query_count
        query_count += 1

    sa_event.listen(engine, "before_cursor_execute", count_queries)
    try:
        r = client.get("/api/admin/users", headers=headers_admin)
    finally:
        sa_event.remove(engine, "before_cursor_execute", count_queries)

    assert r.status_code == 200
    assert len(r.json()) == 5  # админ + 4
    assert query_count <= 5


def test_admin_users_search_by_name(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    register_user("Уникальное Имя")
    register_user("Другой")

    r = client.get("/api/admin/users?q=Уникальное", headers=headers_admin)
    assert len(r.json()) == 1
    assert r.json()[0]["display_name"] == "Уникальное Имя"


def test_admin_users_requires_admin(client, register_user):
    headers = register_user()
    r = client.get("/api/admin/users", headers=headers)
    assert r.status_code == 403


def test_admin_delete_nonexistent_post_error_translated_to_serbian(client, register_admin):
    headers, _ = register_admin()
    r = client.delete("/api/admin/posts/nonexistent-id", headers={**headers, "X-Lang": "sr"})
    assert r.status_code == 404
    assert r.json()["detail"] == "Objava nije pronađena"


def test_invalid_role_error_translated_to_serbian(client, register_admin, register_user_with_id):
    headers_admin, _ = register_admin()
    _, target_id = register_user_with_id()

    r = client.patch(
        f"/api/admin/users/{target_id}/role", json={"role": "superadmin"},
        headers={**headers_admin, "X-Lang": "sr"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "Uloga mora biti jedna od: user, editor, moderator"


def test_provider_not_found_error_translated_to_serbian(client, register_admin):
    headers, _ = register_admin()
    r = client.patch(
        "/api/admin/service-providers/nonexistent-id/verify", headers={**headers, "X-Lang": "sr"}
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "Profil pružaoca usluga nije pronađen"
