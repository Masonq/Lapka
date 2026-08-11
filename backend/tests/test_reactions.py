def test_react_to_post_creates_reaction(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers,
    ).json()

    r = client.put(f"/api/posts/{post['id']}/reaction", json={"emoji": "👍"}, headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["reactions"] == {"👍": 1}
    assert data["my_reaction"] == "👍"


def test_react_to_post_changes_existing_reaction(client, register_user):
    """Смена реакции — не добавляет вторую, заменяет первую (как Facebook,
    не как Slack, где можно ставить несколько разных реакций одному посту)."""
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers,
    ).json()

    client.put(f"/api/posts/{post['id']}/reaction", json={"emoji": "👍"}, headers=headers)
    r = client.put(f"/api/posts/{post['id']}/reaction", json={"emoji": "❤️"}, headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["reactions"] == {"❤️": 1}
    assert data["my_reaction"] == "❤️"


def test_remove_reaction(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers,
    ).json()

    client.put(f"/api/posts/{post['id']}/reaction", json={"emoji": "👍"}, headers=headers)
    r = client.delete(f"/api/posts/{post['id']}/reaction", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["reactions"] == {}
    assert data["my_reaction"] is None


def test_invalid_emoji_rejected(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers,
    ).json()

    r = client.put(f"/api/posts/{post['id']}/reaction", json={"emoji": "😀"}, headers=headers)
    assert r.status_code == 400


def test_reaction_requires_auth(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers,
    ).json()

    r = client.put(f"/api/posts/{post['id']}/reaction", json={"emoji": "👍"})
    assert r.status_code == 401


def test_reaction_on_nonexistent_post_404(client, register_user):
    headers = register_user()
    r = client.put("/api/posts/does-not-exist/reaction", json={"emoji": "👍"}, headers=headers)
    assert r.status_code == 404


def test_reaction_counts_aggregate_across_users(client, register_user):
    """Реакции от разных пользователей на один пост — счётчик по каждой
    эмодзи агрегируется верно, не перезаписывает друг друга."""
    headers1 = register_user()
    headers2 = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers1,
    ).json()

    client.put(f"/api/posts/{post['id']}/reaction", json={"emoji": "👍"}, headers=headers1)
    r = client.put(f"/api/posts/{post['id']}/reaction", json={"emoji": "👍"}, headers=headers2)
    assert r.status_code == 200
    assert r.json()["reactions"] == {"👍": 2}

    # каждый видит СВОЮ реакцию в my_reaction, но общий счётчик один на всех
    get1 = client.get(f"/api/posts/{post['id']}", headers=headers1).json()
    assert get1["my_reaction"] == "👍"
    assert get1["reactions"] == {"👍": 2}


def test_reaction_visible_in_post_list(client, register_user):
    """Реакции корректно попадают в батч-загрузку списка постов (лента),
    не только при запросе одного поста."""
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers,
    ).json()
    client.put(f"/api/posts/{post['id']}/reaction", json={"emoji": "🐾"}, headers=headers)

    r = client.get("/api/posts", headers=headers)
    assert r.status_code == 200
    found = next(p for p in r.json() if p["id"] == post["id"])
    assert found["reactions"] == {"🐾": 1}
    assert found["my_reaction"] == "🐾"
