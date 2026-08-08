def test_follow_creates_relationship_visible_in_followers(client, register_user, register_user_with_id):
    headers_follower = register_user("Подписчик")
    _, target_id = register_user_with_id("Автор")

    r = client.post(f"/api/follows/{target_id}", headers=headers_follower)
    assert r.status_code == 200

    r = client.get(f"/api/follows/{target_id}/followers")
    names = [u["display_name"] for u in r.json()]
    assert names == ["Подписчик"]


def test_unfollow_removes_relationship(client, register_user, register_user_with_id):
    headers_follower = register_user("Подписчик")
    _, target_id = register_user_with_id("Автор")

    client.post(f"/api/follows/{target_id}", headers=headers_follower)
    r = client.delete(f"/api/follows/{target_id}", headers=headers_follower)
    assert r.status_code == 200

    r = client.get(f"/api/follows/{target_id}/followers")
    assert r.json() == []


def test_cannot_follow_self(client, register_user_with_id):
    headers, own_id = register_user_with_id()
    r = client.post(f"/api/follows/{own_id}", headers=headers)
    assert r.status_code == 400


def test_follow_nonexistent_user_404(client, register_user):
    headers = register_user()
    r = client.post("/api/follows/does-not-exist", headers=headers)
    assert r.status_code == 404


def test_follow_twice_does_not_duplicate(client, register_user, register_user_with_id):
    headers_follower = register_user("Подписчик")
    _, target_id = register_user_with_id("Автор")

    r1 = client.post(f"/api/follows/{target_id}", headers=headers_follower)
    r2 = client.post(f"/api/follows/{target_id}", headers=headers_follower)
    assert r1.status_code == 200
    assert r2.status_code == 200

    r = client.get(f"/api/follows/{target_id}/followers")
    assert len(r.json()) == 1


def test_follow_requires_auth(client):
    r = client.post("/api/follows/some-id")
    assert r.status_code == 401


def test_followers_of_user_with_no_followers_is_empty_list(client, register_user_with_id):
    _, user_id = register_user_with_id()
    r = client.get(f"/api/follows/{user_id}/followers")
    assert r.status_code == 200
    assert r.json() == []
