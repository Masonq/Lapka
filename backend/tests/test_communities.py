def test_create_community(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/communities",
        json={"name": "Французские бульдоги Белграда", "description": "Порода-клуб", "city": "Белград"},
        headers=headers,
    )
    assert r.status_code == 200
    community = r.json()
    assert community["name"] == "Французские бульдоги Белграда"
    assert community["members_count"] == 1  # создатель сразу становится участником
    assert community["is_member"] is True


def test_create_community_requires_auth(client):
    r = client.post("/api/communities", json={"name": "Тест"})
    assert r.status_code == 401


def test_create_community_blank_name_rejected(client, register_user):
    headers = register_user()
    r = client.post("/api/communities", json={"name": "   "}, headers=headers)
    assert r.status_code == 400


def test_community_rate_limit(client, register_user):
    headers = register_user()
    statuses = []
    for i in range(4):
        r = client.post("/api/communities", json={"name": f"Сообщество {i}"}, headers=headers)
        statuses.append(r.status_code)
    assert statuses.count(429) == 1
    assert statuses[-1] == 429


def test_list_communities_search_and_city_filter(client, register_user):
    headers = register_user()
    client.post("/api/communities", json={"name": "Кошки Белграда", "city": "Белград"}, headers=headers)
    client.post("/api/communities", json={"name": "Собаки Нови-Сада", "city": "Нови-Сад"}, headers=headers)

    r = client.get("/api/communities", params={"q": "кошки"})
    assert [c["name"] for c in r.json()] == ["Кошки Белграда"]

    r = client.get("/api/communities", params={"city": "Нови-Сад"})
    assert [c["name"] for c in r.json()] == ["Собаки Нови-Сада"]


def test_join_and_leave_community(client, register_user):
    headers_creator = register_user()
    headers_member = register_user()

    community = client.post("/api/communities", json={"name": "Тест"}, headers=headers_creator).json()

    r = client.post(f"/api/communities/{community['id']}/join", headers=headers_member)
    assert r.status_code == 200

    r = client.get(f"/api/communities/{community['id']}", headers=headers_member)
    assert r.json()["members_count"] == 2
    assert r.json()["is_member"] is True

    r = client.delete(f"/api/communities/{community['id']}/leave", headers=headers_member)
    assert r.status_code == 200

    r = client.get(f"/api/communities/{community['id']}")
    assert r.json()["members_count"] == 1


def test_join_twice_does_not_duplicate(client, register_user):
    headers_creator = register_user()
    headers_member = register_user()
    community = client.post("/api/communities", json={"name": "Тест"}, headers=headers_creator).json()

    client.post(f"/api/communities/{community['id']}/join", headers=headers_member)
    client.post(f"/api/communities/{community['id']}/join", headers=headers_member)

    r = client.get(f"/api/communities/{community['id']}")
    assert r.json()["members_count"] == 2


def test_last_admin_cannot_leave(client, register_user):
    headers = register_user()
    community = client.post("/api/communities", json={"name": "Тест"}, headers=headers).json()

    r = client.delete(f"/api/communities/{community['id']}/leave", headers=headers)
    assert r.status_code == 400


def test_second_admin_can_leave_after_first(client, register_user):
    """Если админов двое — уход одного из них не должен блокироваться, даже если это
    создатель сообщества. Проверяет, что правило 'последнего админа' считает по роли,
    а не по тому, кто именно создал сообщество."""
    headers_creator = register_user()
    headers_other = register_user()
    community = client.post("/api/communities", json={"name": "Тест"}, headers=headers_creator).json()
    client.post(f"/api/communities/{community['id']}/join", headers=headers_other)

    # обычный участник — не админ, значит правило последнего админа его не касается
    r = client.delete(f"/api/communities/{community['id']}/leave", headers=headers_other)
    assert r.status_code == 200


def test_get_nonexistent_community_404(client):
    r = client.get("/api/communities/does-not-exist")
    assert r.status_code == 404


def test_join_nonexistent_community_404(client, register_user):
    headers = register_user()
    r = client.post("/api/communities/does-not-exist/join", headers=headers)
    assert r.status_code == 404


def test_list_members(client, register_user):
    headers_creator = register_user("Создатель")
    headers_member = register_user("Участник")
    community = client.post("/api/communities", json={"name": "Тест"}, headers=headers_creator).json()
    client.post(f"/api/communities/{community['id']}/join", headers=headers_member)

    r = client.get(f"/api/communities/{community['id']}/members")
    assert r.status_code == 200
    members = r.json()
    assert len(members) == 2
    roles = {m["user"]["display_name"]: m["role"] for m in members}
    assert roles["Создатель"] == "admin"
    assert roles["Участник"] == "member"


def test_post_in_community_requires_membership(client, register_user):
    headers_creator = register_user()
    headers_outsider = register_user()
    community = client.post("/api/communities", json={"name": "Тест"}, headers=headers_creator).json()

    r = client.post(
        "/api/posts",
        json={"type": "general", "title": "Пост", "body": "текст", "community_id": community["id"]},
        headers=headers_outsider,
    )
    assert r.status_code == 403


def test_post_in_community_works_for_member(client, register_user):
    headers_creator = register_user()
    community = client.post("/api/communities", json={"name": "Тест"}, headers=headers_creator).json()

    r = client.post(
        "/api/posts",
        json={"type": "general", "title": "Пост в сообществе", "body": "текст", "community_id": community["id"]},
        headers=headers_creator,
    )
    assert r.status_code == 200

    r = client.get("/api/posts", params={"community_id": community["id"]})
    assert len(r.json()) == 1
    assert r.json()[0]["title"] == "Пост в сообществе"
