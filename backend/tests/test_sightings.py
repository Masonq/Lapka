def test_add_sighting_to_lost_post(client, register_user):
    headers_author = register_user()
    headers_reporter = register_user("Свидетель")
    post = client.post(
        "/api/posts", json={"type": "lost", "title": "Пропала Бела", "body": "текст"}, headers=headers_author
    ).json()

    r = client.post(
        f"/api/posts/{post['id']}/sightings",
        json={"location": "Парк Ташмайдан, у фонтана", "note": "Бежала в сторону улицы"},
        headers=headers_reporter,
    )
    assert r.status_code == 200
    sighting = r.json()
    assert sighting["location"] == "Парк Ташмайдан, у фонтана"
    assert sighting["reporter"]["display_name"] == "Свидетель"


def test_add_sighting_to_found_post(client, register_user):
    headers_author = register_user()
    headers_reporter = register_user()
    post = client.post(
        "/api/posts", json={"type": "found", "title": "Найден кот", "body": "текст"}, headers=headers_author
    ).json()

    r = client.post(
        f"/api/posts/{post['id']}/sightings", json={"location": "Ул. Кнез Михайлова"}, headers=headers_reporter
    )
    assert r.status_code == 200


def test_sighting_rejected_for_non_lost_found_post(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "question", "title": "Вопрос", "body": "текст"}, headers=headers
    ).json()

    r = client.post(f"/api/posts/{post['id']}/sightings", json={"location": "Где-то"}, headers=headers)
    assert r.status_code == 400


def test_sighting_requires_auth(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "lost", "title": "Тест", "body": "текст"}, headers=headers
    ).json()
    r = client.post(f"/api/posts/{post['id']}/sightings", json={"location": "Где-то"})
    assert r.status_code == 401


def test_sighting_on_nonexistent_post_404(client, register_user):
    headers = register_user()
    r = client.post("/api/posts/does-not-exist/sightings", json={"location": "Где-то"}, headers=headers)
    assert r.status_code == 404


def test_list_sightings_ordered_newest_first(client, register_user):
    headers_author = register_user()
    headers_reporter = register_user()
    post = client.post(
        "/api/posts", json={"type": "lost", "title": "Тест", "body": "текст"}, headers=headers_author
    ).json()

    client.post(f"/api/posts/{post['id']}/sightings", json={"location": "Первое место"}, headers=headers_reporter)
    client.post(f"/api/posts/{post['id']}/sightings", json={"location": "Второе место"}, headers=headers_reporter)

    r = client.get(f"/api/posts/{post['id']}/sightings")
    assert r.status_code == 200
    locations = [s["location"] for s in r.json()]
    assert locations == ["Второе место", "Первое место"]


def test_sighting_creates_notification_for_post_author(client, register_user):
    headers_author = register_user()
    headers_reporter = register_user("Свидетель")
    post = client.post(
        "/api/posts", json={"type": "lost", "title": "Пропала Бела", "body": "текст"}, headers=headers_author
    ).json()

    client.post(f"/api/posts/{post['id']}/sightings", json={"location": "Парк"}, headers=headers_reporter)

    r = client.get("/api/notifications", headers=headers_author)
    notifications = r.json()
    assert len(notifications) == 2  # welcome + sighting
    assert notifications[0]["type"] == "sighting"  # самое свежее — первое
    assert notifications[0]["actor"]["display_name"] == "Свидетель"


def test_reporting_own_lost_post_sighting_does_not_notify_self(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "lost", "title": "Тест", "body": "текст"}, headers=headers
    ).json()
    client.post(f"/api/posts/{post['id']}/sightings", json={"location": "Где-то"}, headers=headers)

    r = client.get("/api/notifications", headers=headers)
    notifications = r.json()
    assert len(notifications) == 1  # только welcome
    assert notifications[0]["type"] == "welcome"


def test_sighting_rate_limit(client, register_user):
    headers_author = register_user()
    headers_reporter = register_user()
    post = client.post(
        "/api/posts", json={"type": "lost", "title": "Тест", "body": "текст"}, headers=headers_author
    ).json()

    statuses = []
    for i in range(16):
        r = client.post(
            f"/api/posts/{post['id']}/sightings", json={"location": f"Место {i}"}, headers=headers_reporter
        )
        statuses.append(r.status_code)
    assert statuses.count(429) == 1
    assert statuses[-1] == 429
