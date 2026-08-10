def test_create_and_list_story(client, register_user):
    headers = register_user("Автор")
    r = client.post("/api/stories", json={"photo_url": "/uploads/x.jpg"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["photo_url"] == "/uploads/x.jpg"
    assert r.json()["author"]["display_name"] == "Автор"

    r = client.get("/api/stories", headers=headers)
    assert len(r.json()) == 1


def test_create_story_requires_auth(client):
    r = client.post("/api/stories", json={"photo_url": "/uploads/x.jpg"})
    assert r.status_code == 401


def test_list_stories_requires_auth(client):
    r = client.get("/api/stories")
    assert r.status_code == 401


def test_expired_story_not_listed(client, register_user):
    """Истёкшая история не должна попадать в список — проверяем напрямую через БД,
    двигая expires_at в прошлое (в реальности этого ждать пришлось бы 24 часа)."""
    from datetime import datetime, timedelta, timezone
    from app.core.db import SessionLocal
    from app.models.models import Story

    headers = register_user()
    client.post("/api/stories", json={"photo_url": "/uploads/x.jpg"}, headers=headers)

    db = SessionLocal()
    story = db.query(Story).first()
    story.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db.commit()
    db.close()

    r = client.get("/api/stories", headers=headers)
    assert r.json() == []


def test_delete_own_story(client, register_user):
    headers = register_user()
    story = client.post("/api/stories", json={"photo_url": "/uploads/x.jpg"}, headers=headers).json()

    r = client.delete(f"/api/stories/{story['id']}", headers=headers)
    assert r.status_code == 200

    r = client.get("/api/stories", headers=headers)
    assert r.json() == []


def test_cannot_delete_others_story(client, register_user):
    headers_a = register_user("Ана")
    headers_b = register_user("Боб")
    story = client.post("/api/stories", json={"photo_url": "/uploads/x.jpg"}, headers=headers_a).json()

    r = client.delete(f"/api/stories/{story['id']}", headers=headers_b)
    assert r.status_code == 403


def test_delete_nonexistent_story_404(client, register_user):
    headers = register_user()
    r = client.delete("/api/stories/does-not-exist", headers=headers)
    assert r.status_code == 404


def test_blocked_user_stories_hidden(client, register_user_with_id):
    headers_a, id_a = register_user_with_id("Ана")
    headers_b, id_b = register_user_with_id("Боб")

    client.post("/api/stories", json={"photo_url": "/uploads/a.jpg"}, headers=headers_a)
    client.post("/api/stories", json={"photo_url": "/uploads/b.jpg"}, headers=headers_b)
    client.post(f"/api/blocks/{id_b}", headers=headers_a)

    r = client.get("/api/stories", headers=headers_a)
    authors = [s["author"]["id"] for s in r.json()]
    assert id_b not in authors


def test_story_rate_limit(client, register_user):
    headers = register_user()
    for i in range(10):
        r = client.post("/api/stories", json={"photo_url": f"/uploads/{i}.jpg"}, headers=headers)
        assert r.status_code == 200
    r = client.post("/api/stories", json={"photo_url": "/uploads/last.jpg"}, headers=headers)
    assert r.status_code == 429


def test_list_stories_query_count_does_not_scale_with_result_size(client, register_user):
    from app.core.db import engine
    from sqlalchemy import event as sa_event

    headers = register_user()
    for i in range(4):
        headers_author = register_user(f"Автор{i}")
        client.post("/api/stories", json={"photo_url": f"/uploads/{i}.jpg"}, headers=headers_author)

    query_count = 0

    def count_queries(*args, **kwargs):
        nonlocal query_count
        query_count += 1

    sa_event.listen(engine, "before_cursor_execute", count_queries)
    try:
        r = client.get("/api/stories", headers=headers)
    finally:
        sa_event.remove(engine, "before_cursor_execute", count_queries)

    assert len(r.json()) == 4
    assert query_count <= 3


def test_delete_other_users_story_error_translated_to_serbian(client, register_user):
    headers_author = register_user("Автор")
    headers_other = register_user("Другой")
    story = client.post(
        "/api/stories", json={"photo_url": "https://example.com/photo.jpg"}, headers=headers_author
    ).json()

    r = client.delete(f"/api/stories/{story['id']}", headers={**headers_other, "X-Lang": "sr"})
    assert r.status_code == 403
    assert r.json()["detail"] == "Možeš obrisati samo svoju priču"
