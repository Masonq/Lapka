def test_save_and_unsave_post(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers
    ).json()
    assert post["is_saved"] is False

    r = client.post(f"/api/posts/{post['id']}/save", headers=headers)
    assert r.status_code == 200

    r = client.get(f"/api/posts/{post['id']}", headers=headers)
    assert r.json()["is_saved"] is True

    r = client.delete(f"/api/posts/{post['id']}/save", headers=headers)
    assert r.status_code == 200

    r = client.get(f"/api/posts/{post['id']}", headers=headers)
    assert r.json()["is_saved"] is False


def test_save_twice_does_not_duplicate(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers
    ).json()

    client.post(f"/api/posts/{post['id']}/save", headers=headers)
    client.post(f"/api/posts/{post['id']}/save", headers=headers)

    r = client.get("/api/posts/saved", headers=headers)
    assert len(r.json()) == 1


def test_save_requires_auth(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers
    ).json()
    r = client.post(f"/api/posts/{post['id']}/save")
    assert r.status_code == 401


def test_save_nonexistent_post_404(client, register_user):
    headers = register_user()
    r = client.post("/api/posts/does-not-exist/save", headers=headers)
    assert r.status_code == 404


def test_saved_list_shows_most_recently_saved_first(client, register_user):
    headers = register_user()
    post_a = client.post(
        "/api/posts", json={"type": "general", "title": "Первый", "body": "текст"}, headers=headers
    ).json()
    post_b = client.post(
        "/api/posts", json={"type": "general", "title": "Второй", "body": "текст"}, headers=headers
    ).json()

    client.post(f"/api/posts/{post_a['id']}/save", headers=headers)
    client.post(f"/api/posts/{post_b['id']}/save", headers=headers)

    r = client.get("/api/posts/saved", headers=headers)
    titles = [p["title"] for p in r.json()]
    assert titles == ["Второй", "Первый"]
    assert all(p["is_saved"] for p in r.json())


def test_saved_list_empty_when_nothing_saved(client, register_user):
    headers = register_user()
    r = client.get("/api/posts/saved", headers=headers)
    assert r.status_code == 200
    assert r.json() == []


def test_report_post(client, register_user):
    headers_reporter = register_user()
    headers_author = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers_author
    ).json()

    r = client.post(f"/api/posts/{post['id']}/report", json={"reason": "Спам"}, headers=headers_reporter)
    assert r.status_code == 200


def test_report_nonexistent_post_404(client, register_user):
    headers = register_user()
    r = client.post("/api/posts/does-not-exist/report", json={"reason": "Спам"}, headers=headers)
    assert r.status_code == 404


def test_report_requires_auth(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers
    ).json()
    r = client.post(f"/api/posts/{post['id']}/report", json={"reason": "Спам"})
    assert r.status_code == 401


def test_report_rate_limited(client, register_user):
    headers_reporter = register_user()
    # 3 автора (не 11 — иначе упрёмся в register_limiter, 5 регистраций/час с одного IP
    # в тестовом окружении), по несколько постов каждый (не больше 5 — предел post_limiter)
    authors = [register_user() for _ in range(3)]
    posts = []
    for i in range(11):
        headers_author = authors[i % 3]
        posts.append(
            client.post(
                "/api/posts", json={"type": "general", "title": f"Пост {i}", "body": "текст"}, headers=headers_author
            ).json()
        )

    statuses = [
        client.post(f"/api/posts/{p['id']}/report", json={}, headers=headers_reporter).status_code
        for p in posts
    ]
    assert statuses.count(429) == 1
    assert statuses[-1] == 429
