def test_become_provider_and_list(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/services",
        json={"service_type": "sitter", "description": "Выгул собак в Дорчоле", "price_from": 800},
        headers=headers,
    )
    assert r.status_code == 200

    r = client.get("/api/services")
    assert len(r.json()) == 1
    assert r.json()[0]["service_type"] == "sitter"


def test_cannot_become_provider_twice(client, register_user):
    headers = register_user()
    payload = {"service_type": "sitter", "description": "Выгул собак"}
    client.post("/api/services", json=payload, headers=headers)
    r = client.post("/api/services", json=payload, headers=headers)
    assert r.status_code == 400


def test_cannot_review_self(client, register_user):
    headers = register_user()
    provider = client.post(
        "/api/services", json={"service_type": "vet", "description": "Ветеринар"}, headers=headers
    ).json()

    r = client.post(f"/api/services/{provider['id']}/reviews", json={"rating": 5}, headers=headers)
    assert r.status_code == 400


def test_cannot_review_same_provider_twice(client, register_user):
    headers_provider = register_user()
    headers_reviewer = register_user()

    provider = client.post(
        "/api/services", json={"service_type": "trainer", "description": "Кинолог"}, headers=headers_provider
    ).json()

    r1 = client.post(f"/api/services/{provider['id']}/reviews", json={"rating": 5}, headers=headers_reviewer)
    assert r1.status_code == 200

    r2 = client.post(f"/api/services/{provider['id']}/reviews", json={"rating": 1}, headers=headers_reviewer)
    assert r2.status_code == 400


def test_rating_average_computed_correctly(client, register_user):
    headers_provider = register_user()
    provider = client.post(
        "/api/services", json={"service_type": "groomer", "description": "Грумер"}, headers=headers_provider
    ).json()

    for rating in (5, 3):
        headers_reviewer = register_user()
        client.post(f"/api/services/{provider['id']}/reviews", json={"rating": rating}, headers=headers_reviewer)

    r = client.get("/api/services")
    updated = next(p for p in r.json() if p["id"] == provider["id"])
    assert updated["rating_count"] == 2
    assert updated["rating_avg"] == 4.0


def test_list_reviews_shows_author_and_text(client, register_user):
    headers_provider = register_user()
    provider = client.post(
        "/api/services", json={"service_type": "sitter", "description": "Ситтер"}, headers=headers_provider
    ).json()

    headers_reviewer = register_user("Марко")
    client.post(
        f"/api/services/{provider['id']}/reviews",
        json={"rating": 5, "body": "Отличный ситтер!"},
        headers=headers_reviewer,
    )

    r = client.get(f"/api/services/{provider['id']}/reviews")
    assert r.status_code == 200
    reviews = r.json()
    assert len(reviews) == 1
    assert reviews[0]["author"]["display_name"] == "Марко"
    assert reviews[0]["body"] == "Отличный ситтер!"


def test_list_reviews_for_provider_without_reviews_is_empty(client, register_user):
    headers_provider = register_user()
    provider = client.post(
        "/api/services", json={"service_type": "vet", "description": "Ветеринар"}, headers=headers_provider
    ).json()

    r = client.get(f"/api/services/{provider['id']}/reviews")
    assert r.status_code == 200
    assert r.json() == []


def test_list_providers_query_count_does_not_scale_with_result_size(client, register_user):
    """Тот же класс N+1, что уже находил в posts.py/communities.py/events.py/messages.py —
    provider.user через ленивую связь давал отдельный запрос на каждого исполнителя."""
    from app.core.db import engine
    from sqlalchemy import event as sa_event

    for i in range(3):
        headers = register_user(f"Исполнитель{i}")
        client.post("/api/services", json={"service_type": "sitter", "description": "Ситтер"}, headers=headers)

    query_count = 0

    def count_queries(*args, **kwargs):
        nonlocal query_count
        query_count += 1

    sa_event.listen(engine, "before_cursor_execute", count_queries)
    try:
        r = client.get("/api/services")
    finally:
        sa_event.remove(engine, "before_cursor_execute", count_queries)

    assert len(r.json()) == 3
    assert query_count <= 2  # 1 запрос провайдеров (с joinedload user) — без отдельных на каждого
