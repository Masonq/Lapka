import xml.etree.ElementTree as ET

SITEMAP_NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"


def _locs(xml_text):
    root = ET.fromstring(xml_text)
    return {url.find(f"{SITEMAP_NS}loc").text for url in root.findall(f"{SITEMAP_NS}url")}


def test_sitemap_is_valid_xml_with_static_pages(client):
    r = client.get("/api/sitemap.xml")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/xml")

    locs = _locs(r.text)
    assert "https://lapki.info/" in locs
    assert "https://lapki.info/marketplace" in locs
    assert "https://lapki.info/events" in locs
    assert "https://lapki.info/communities" in locs


def test_sitemap_does_not_require_auth(client):
    # Без единого заголовка Authorization — публичный эндпоинт
    r = client.get("/api/sitemap.xml")
    assert r.status_code == 200


def test_sitemap_includes_real_post(client, register_user):
    headers = register_user()
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers
    ).json()

    locs = _locs(client.get("/api/sitemap.xml").text)
    assert f"https://lapki.info/posts/{post['id']}" in locs


def test_sitemap_includes_real_community_and_event(client, register_user):
    headers = register_user()
    community = client.post(
        "/api/communities", json={"name": "Тест", "description": "d", "city": "Beograd"}, headers=headers
    ).json()
    event = client.post(
        "/api/events",
        json={"type": "walk", "title": "Прогулка", "description": "d", "starts_at": "2026-08-15T10:00:00Z"},
        headers=headers,
    ).json()

    locs = _locs(client.get("/api/sitemap.xml").text)
    assert f"https://lapki.info/communities/{community['id']}" in locs
    assert f"https://lapki.info/events/{event['id']}" in locs


def test_sitemap_excludes_sold_listings(client, register_user):
    """Проданное объявление — неактуальный контент, не должен индексироваться
    как активный. is_sold=True исключается фильтром в самом запросе."""
    headers = register_user()
    active = client.post(
        "/api/marketplace", json={"type": "sell", "title": "Активное", "price": 100}, headers=headers
    ).json()
    sold = client.post(
        "/api/marketplace", json={"type": "sell", "title": "Продано", "price": 200}, headers=headers
    ).json()
    client.patch(f"/api/marketplace/{sold['id']}/mark-sold", headers=headers)

    locs = _locs(client.get("/api/sitemap.xml").text)
    assert f"https://lapki.info/marketplace/{active['id']}" in locs
    assert f"https://lapki.info/marketplace/{sold['id']}" not in locs
