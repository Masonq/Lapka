def test_create_event(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/events",
        json={"type": "event", "title": "Выставка собак", "starts_at": "2026-09-01T18:00:00Z"},
        headers=headers,
    )
    assert r.status_code == 200
    event = r.json()
    assert event["title"] == "Выставка собак"
    assert event["participants_count"] == 1  # организатор сразу идёт
    assert event["is_going"] is True


def test_create_event_requires_auth(client):
    r = client.post("/api/events", json={"type": "event", "title": "Тест", "starts_at": "2026-09-01T18:00:00Z"})
    assert r.status_code == 401


def test_create_event_unknown_type_rejected(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/events", json={"type": "party", "title": "Тест", "starts_at": "2026-09-01T18:00:00Z"}, headers=headers
    )
    assert r.status_code == 400


def test_event_rate_limit(client, register_user):
    headers = register_user()
    statuses = []
    for i in range(6):
        r = client.post(
            "/api/events",
            json={"type": "event", "title": f"Событие {i}", "starts_at": "2026-09-01T18:00:00Z"},
            headers=headers,
        )
        statuses.append(r.status_code)
    assert statuses.count(429) == 1
    assert statuses[-1] == 429


def test_walk_with_own_pet(client, register_user):
    headers = register_user()
    pet = client.post("/api/pets", json={"name": "Бела", "species": "Собака"}, headers=headers).json()

    r = client.post(
        "/api/events",
        json={"type": "walk", "title": "Прогулка в парке", "starts_at": "2026-09-01T18:00:00Z", "pet_id": pet["id"]},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["pet_name"] == "Бела"


def test_walk_with_someone_elses_pet_rejected(client, register_user):
    headers_owner = register_user()
    headers_other = register_user()
    pet = client.post("/api/pets", json={"name": "Бела", "species": "Собака"}, headers=headers_owner).json()

    r = client.post(
        "/api/events",
        json={"type": "walk", "title": "Прогулка", "starts_at": "2026-09-01T18:00:00Z", "pet_id": pet["id"]},
        headers=headers_other,
    )
    assert r.status_code == 403


def test_join_and_leave_event(client, register_user):
    headers_organizer = register_user()
    headers_participant = register_user()

    event = client.post(
        "/api/events", json={"type": "event", "title": "Тест", "starts_at": "2026-09-01T18:00:00Z"},
        headers=headers_organizer,
    ).json()

    r = client.post(f"/api/events/{event['id']}/join", headers=headers_participant)
    assert r.status_code == 200

    r = client.get(f"/api/events/{event['id']}", headers=headers_participant)
    assert r.json()["participants_count"] == 2
    assert r.json()["is_going"] is True

    r = client.delete(f"/api/events/{event['id']}/leave", headers=headers_participant)
    assert r.status_code == 200

    r = client.get(f"/api/events/{event['id']}")
    assert r.json()["participants_count"] == 1


def test_join_respects_capacity(client, register_user):
    headers_organizer = register_user()
    event = client.post(
        "/api/events",
        json={"type": "event", "title": "Тест", "starts_at": "2026-09-01T18:00:00Z", "capacity": 1},
        headers=headers_organizer,
    ).json()
    # организатор уже занял единственное место

    headers_other = register_user()
    r = client.post(f"/api/events/{event['id']}/join", headers=headers_other)
    assert r.status_code == 400


def test_join_twice_does_not_duplicate(client, register_user):
    headers_organizer = register_user()
    headers_participant = register_user()
    event = client.post(
        "/api/events", json={"type": "event", "title": "Тест", "starts_at": "2026-09-01T18:00:00Z"},
        headers=headers_organizer,
    ).json()

    client.post(f"/api/events/{event['id']}/join", headers=headers_participant)
    client.post(f"/api/events/{event['id']}/join", headers=headers_participant)

    r = client.get(f"/api/events/{event['id']}")
    assert r.json()["participants_count"] == 2


def test_get_nonexistent_event_404(client):
    r = client.get("/api/events/does-not-exist")
    assert r.status_code == 404


def test_join_nonexistent_event_404(client, register_user):
    headers = register_user()
    r = client.post("/api/events/does-not-exist/join", headers=headers)
    assert r.status_code == 404


def test_list_events_filter_by_type(client, register_user):
    headers = register_user()
    client.post(
        "/api/events", json={"type": "walk", "title": "Прогулка", "starts_at": "2026-09-01T18:00:00Z"}, headers=headers
    )
    client.post(
        "/api/events", json={"type": "event", "title": "Событие", "starts_at": "2026-09-01T18:00:00Z"}, headers=headers
    )

    r = client.get("/api/events", params={"type": "walk"})
    assert [e["title"] for e in r.json()] == ["Прогулка"]


def test_search_events_by_title(client, register_user):
    headers = register_user()
    client.post(
        "/api/events", json={"type": "event", "title": "Выставка собак", "starts_at": "2026-09-01T18:00:00Z"}, headers=headers
    )
    client.post(
        "/api/events", json={"type": "event", "title": "Мастер-класс по дрессировке", "starts_at": "2026-09-01T18:00:00Z"}, headers=headers
    )

    r = client.get("/api/events", params={"q": "выставка"})
    assert [e["title"] for e in r.json()] == ["Выставка собак"]


def test_list_participants(client, register_user):
    headers_organizer = register_user("Организатор")
    headers_participant = register_user("Участник")
    event = client.post(
        "/api/events", json={"type": "event", "title": "Тест", "starts_at": "2026-09-01T18:00:00Z"},
        headers=headers_organizer,
    ).json()
    client.post(f"/api/events/{event['id']}/join", headers=headers_participant)

    r = client.get(f"/api/events/{event['id']}/participants")
    names = {p["user"]["display_name"] for p in r.json()}
    assert names == {"Организатор", "Участник"}


def test_list_events_query_count_does_not_scale_with_result_size(client, register_user):
    """Тот же N+1, что нашёлся и починился в communities.py — подсчёт участников
    (event.participants внутри цикла) давал отдельный запрос на каждое событие."""
    from app.core.db import engine
    from sqlalchemy import event as sa_event

    headers = register_user()
    for i in range(3):
        client.post(
            "/api/events", json={"type": "event", "title": f"Событие {i}", "starts_at": "2026-09-01T18:00:00Z"},
            headers=headers,
        )

    query_count = 0

    def count_queries(*args, **kwargs):
        nonlocal query_count
        query_count += 1

    sa_event.listen(engine, "before_cursor_execute", count_queries)
    try:
        r = client.get("/api/events")
    finally:
        sa_event.remove(engine, "before_cursor_execute", count_queries)

    assert len(r.json()) == 3
    assert query_count <= 3


def test_list_participants_query_count_does_not_scale_with_result_size(client, register_user):
    """Тот же класс N+1 — participant.user через ленивую связь давал отдельный
    запрос на каждого участника, не подгружался вместе со списком."""
    from app.core.db import engine
    from sqlalchemy import event as sa_event

    headers_organizer = register_user("Организатор")
    event = client.post(
        "/api/events", json={"type": "event", "title": "Тест", "starts_at": "2027-01-01T18:00:00Z"},
        headers=headers_organizer,
    ).json()

    for i in range(3):
        headers_participant = register_user(f"Участник{i}")
        client.post(f"/api/events/{event['id']}/join", headers=headers_participant)

    query_count = 0

    def count_queries(*args, **kwargs):
        nonlocal query_count
        query_count += 1

    sa_event.listen(engine, "before_cursor_execute", count_queries)
    try:
        r = client.get(f"/api/events/{event['id']}/participants")
    finally:
        sa_event.remove(engine, "before_cursor_execute", count_queries)

    assert len(r.json()) == 4  # организатор + 3 участника
    assert query_count <= 2  # 1 запрос участников (с joinedload user) — без отдельных на каждого
