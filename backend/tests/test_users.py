def test_get_user_by_id(client, register_user_with_id):
    headers, user_id = register_user_with_id("Ана")
    r = client.get(f"/api/users/{user_id}")
    assert r.status_code == 200
    assert r.json()["display_name"] == "Ана"


def test_get_nonexistent_user_404(client):
    r = client.get("/api/users/does-not-exist")
    assert r.status_code == 404


def test_me_requires_auth(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_returns_current_user(client, register_user_with_id):
    headers, user_id = register_user_with_id("Марко")
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["id"] == user_id
    assert r.json()["display_name"] == "Марко"


def test_is_admin_not_leaked_in_public_user_schema(client, register_admin):
    headers_admin, admin_id = register_admin()

    # сам себе через /me — is_admin виден
    r = client.get("/api/auth/me", headers=headers_admin)
    assert r.json()["is_admin"] is True

    # но в публичном профиле (общая UserOut) поля is_admin вообще нет
    r = client.get(f"/api/users/{admin_id}")
    assert "is_admin" not in r.json()


def test_filter_posts_by_author(client, register_user):
    headers_a = register_user()
    headers_b = register_user()

    client.post("/api/posts", json={"type": "general", "title": "Пост Аны", "body": "текст"}, headers=headers_a)
    client.post("/api/posts", json={"type": "general", "title": "Пост Марко", "body": "текст"}, headers=headers_b)

    author_a_id = client.get("/api/auth/me", headers=headers_a).json()["id"]

    r = client.get("/api/posts", params={"author_id": author_a_id})
    titles = [p["title"] for p in r.json()]
    assert titles == ["Пост Аны"]
