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
