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
