def test_moderator_can_delete_post_but_not_manage_users(client, register_with_role, register_user):
    headers_mod, _ = register_with_role("moderator")
    headers_author = register_user("Автор")
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "Тело"}, headers=headers_author
    ).json()

    r = client.delete(f"/api/admin/posts/{post['id']}", headers=headers_mod)
    assert r.status_code == 200

    # но список пользователей — только для настоящего админа
    r = client.get("/api/admin/users", headers=headers_mod)
    assert r.status_code == 403


def test_moderator_can_delete_story(client, register_with_role, register_user):
    headers_mod, _ = register_with_role("moderator")
    headers_author = register_user("Автор")
    story = client.post("/api/stories", json={"photo_url": "/uploads/x.jpg"}, headers=headers_author).json()

    r = client.delete(f"/api/admin/stories/{story['id']}", headers=headers_mod)
    assert r.status_code == 200

    r = client.get("/api/stories", headers=headers_author)
    assert r.json() == []


def test_editor_cannot_delete_posts(client, register_with_role, register_user):
    headers_editor, _ = register_with_role("editor")
    headers_author = register_user("Автор")
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "Тело"}, headers=headers_author
    ).json()

    r = client.delete(f"/api/admin/posts/{post['id']}", headers=headers_editor)
    assert r.status_code == 403


def test_editor_can_verify_provider(client, register_with_role, register_user):
    headers_editor, _ = register_with_role("editor")
    headers_provider = register_user("Исполнитель")
    provider = client.post(
        "/api/services", json={"service_type": "sitter", "description": "Опыт"}, headers=headers_provider
    ).json()

    r = client.patch(f"/api/admin/service-providers/{provider['id']}/verify", headers=headers_editor)
    assert r.status_code == 200
    assert r.json()["is_verified"] is True


def test_regular_user_cannot_moderate(client, register_user):
    headers = register_user()
    r = client.get("/api/admin/reports", headers=headers)
    assert r.status_code == 403


def test_admin_can_set_user_role(client, register_admin, register_user_with_id):
    headers_admin, _ = register_admin()
    headers_target, target_id = register_user_with_id("Цель")

    r = client.patch(f"/api/admin/users/{target_id}/role", json={"role": "moderator"}, headers=headers_admin)
    assert r.status_code == 200
    assert r.json()["role"] == "moderator"

    # теперь этот пользователь реально может модерировать
    r = client.get("/api/admin/reports", headers=headers_target)
    assert r.status_code == 200


def test_moderator_cannot_set_roles(client, register_with_role, register_user_with_id):
    """Защита от самоповышения — модератор не может назначать роли, только настоящий админ."""
    headers_mod, _ = register_with_role("moderator")
    _, target_id = register_user_with_id("Цель")

    r = client.patch(f"/api/admin/users/{target_id}/role", json={"role": "moderator"}, headers=headers_mod)
    assert r.status_code == 403


def test_set_invalid_role_rejected(client, register_admin, register_user_with_id):
    headers_admin, _ = register_admin()
    _, target_id = register_user_with_id("Цель")

    r = client.patch(f"/api/admin/users/{target_id}/role", json={"role": "superadmin"}, headers=headers_admin)
    assert r.status_code == 400


def test_moderator_overview_and_reports_access(client, register_with_role):
    headers_mod, _ = register_with_role("moderator")
    r = client.get("/api/admin/overview", headers=headers_mod)
    assert r.status_code == 200
    r = client.get("/api/admin/reports", headers=headers_mod)
    assert r.status_code == 200


def test_editor_cannot_access_overview(client, register_with_role):
    """Редактор — только услуги, не общая операционная сводка (это модератору/админу)."""
    headers_editor, _ = register_with_role("editor")
    r = client.get("/api/admin/overview", headers=headers_editor)
    assert r.status_code == 403
