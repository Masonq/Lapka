"""Динамический sitemap.xml — часть SEO-улучшений вместе с уже существующим
пререндером (см. prerender.py). Отдаётся как /api/sitemap.xml, nginx делает
rewrite на красивый /sitemap.xml в корне домена (там, где его ищут поисковики
по умолчанию) — тот же паттерн, что уже используется для пререндера.
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.models import Community, Event, Listing, Post

router = APIRouter(prefix="/api", tags=["sitemap"])

SITE_URL = "https://lapki.info"

# Разумный потолок на каждый тип контента — при разумном росте проекта не
# должно быть проблемой, но не даёт запросу разрастись бесконтрольно, если
# база вырастет на порядки. У Google лимит 50 000 URL на один sitemap-файл —
# сюда до этого предела ещё очень далеко даже с этими лимитами
MAX_ITEMS_PER_TYPE = 5000

STATIC_PAGES = ["/", "/explore", "/marketplace", "/events", "/communities", "/adoption"]
LEGAL_PAGES = ["/terms", "/privacy", "/guidelines"]


def _url_entry(loc: str, lastmod: "datetime | None" = None, priority: str = "0.5") -> str:
    lastmod_tag = f"<lastmod>{lastmod.strftime('%Y-%m-%d')}</lastmod>" if lastmod else ""
    return f"<url><loc>{loc}</loc>{lastmod_tag}<priority>{priority}</priority></url>"


@router.get("/sitemap.xml")
def sitemap(db: Session = Depends(get_db)):
    entries = [_url_entry(f"{SITE_URL}{path}", priority="0.8") for path in STATIC_PAGES]
    entries += [_url_entry(f"{SITE_URL}{path}", priority="0.3") for path in LEGAL_PAGES]

    posts = db.query(Post.id, Post.created_at).order_by(desc(Post.created_at)).limit(MAX_ITEMS_PER_TYPE).all()
    entries += [_url_entry(f"{SITE_URL}/posts/{p.id}", p.created_at) for p in posts]

    listings = (
        db.query(Listing.id, Listing.created_at)
        .filter(Listing.is_sold.is_(False))
        .order_by(desc(Listing.created_at))
        .limit(MAX_ITEMS_PER_TYPE)
        .all()
    )
    entries += [_url_entry(f"{SITE_URL}/marketplace/{lst.id}", lst.created_at) for lst in listings]

    events = db.query(Event.id, Event.created_at).order_by(desc(Event.created_at)).limit(MAX_ITEMS_PER_TYPE).all()
    entries += [_url_entry(f"{SITE_URL}/events/{e.id}", e.created_at) for e in events]

    communities = (
        db.query(Community.id, Community.created_at)
        .order_by(desc(Community.created_at))
        .limit(MAX_ITEMS_PER_TYPE)
        .all()
    )
    entries += [_url_entry(f"{SITE_URL}/communities/{c.id}", c.created_at) for c in communities]

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>"
    )
    return Response(content=xml, media_type="application/xml")
