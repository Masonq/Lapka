"""Пререндер для поисковиков и соцсетей-краулеров (Googlebot, Telegram, WhatsApp,
Facebook и т.д.) — раздел SEO/prerender из бэклога улучшений.

Полноценный SSR (Next.js или аналог) означал бы смену всего фронтенд-стека —
слишком рискованно для уже работающего проекта. Вместо этого — паттерн
"динамического рендеринга", который сам Google официально рекомендовал для
SPA годами: боты получают простой server-rendered HTML с реальным текстом
и точными og:*/twitter:* тегами конкретного поста, обычные пользователи —
SPA как обычно. nginx определяет ботов по User-Agent и проксирует только их
трафик сюда (см. deploy/nginx.conf), значит эти эндпоинты не участвуют в
обычной работе сайта вообще.

КРИТИЧНО: все пользовательские данные (заголовки/тела постов и т.д.) идут
через html.escape() — это прямая интерполяция в HTML-ответ, не через Jinja2
с автоэкранированием, значит без escape был бы classic stored XSS.
"""
import html
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.models.models import Event, Listing, Post

router = APIRouter(prefix="/api/prerender", tags=["prerender"])

SITE_URL = "https://lapki.info"
DEFAULT_IMAGE = f"{SITE_URL}/og-image.png"

TYPE_LABELS = {
    "lost": "Потерялся", "found": "Найден", "adopt": "Ищет дом",
    "question": "Вопрос", "general": "Пост",
}


def _page(title: str, description: str, url: str, image: str, body_html: str) -> str:
    """Общий каркас HTML-страницы — заголовок/описание/картинка уже экранированы вызывающей стороной."""
    return f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<title>{title}</title>
<meta name="description" content="{description}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Lapki" />
<meta property="og:url" content="{url}" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{description}" />
<meta property="og:image" content="{image}" />
<meta property="og:locale" content="ru_RU" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{description}" />
<meta name="twitter:image" content="{image}" />
<link rel="canonical" href="{url}" />
</head>
<body>
{body_html}
</body>
</html>"""


def _excerpt(text: str, limit: int = 200) -> str:
    text = text.strip()
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"


@router.get("/posts/{post_id}", response_class=HTMLResponse)
def prerender_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(Post).options(joinedload(Post.author)).filter(Post.id == post_id).first()
    if not post:
        return HTMLResponse("<!doctype html><title>Не найдено</title>", status_code=404)

    title = html.escape(f"{post.title} — Lapki")
    description = html.escape(_excerpt(post.body))
    url = html.escape(f"{SITE_URL}/posts/{post.id}")
    image = html.escape(post.photo_url) if post.photo_url else DEFAULT_IMAGE
    if post.photo_url and not post.photo_url.startswith("http"):
        image = html.escape(f"{SITE_URL}{post.photo_url}")

    body_html = f"""
<h1>{html.escape(post.title)}</h1>
<p><b>{html.escape(TYPE_LABELS.get(post.type.value if hasattr(post.type, "value") else post.type, "Пост"))}</b></p>
<p>{html.escape(post.body)}</p>
<p>Автор: {html.escape(post.author.display_name)}</p>
{f'<p>Место: {html.escape(post.last_seen_location)}</p>' if post.last_seen_location else ""}
<p><a href="{url}">Открыть на Lapki</a></p>
"""
    return HTMLResponse(_page(title, description, url, image, body_html))


@router.get("/marketplace/{listing_id}", response_class=HTMLResponse)
def prerender_listing(listing_id: str, db: Session = Depends(get_db)):
    listing = db.query(Listing).options(joinedload(Listing.seller)).filter(Listing.id == listing_id).first()
    if not listing:
        return HTMLResponse("<!doctype html><title>Не найдено</title>", status_code=404)

    title = html.escape(f"{listing.title} — Lapki")
    description = html.escape(_excerpt(listing.description or listing.title))
    url = html.escape(f"{SITE_URL}/marketplace/{listing.id}")
    image = DEFAULT_IMAGE
    if listing.photo_url:
        image = html.escape(listing.photo_url if listing.photo_url.startswith("http") else f"{SITE_URL}{listing.photo_url}")

    price_line = f"<p>{listing.price} дин.</p>" if listing.price is not None else ""
    body_html = f"""
<h1>{html.escape(listing.title)}</h1>
{price_line}
<p>{html.escape(listing.description or "")}</p>
<p>Продавец: {html.escape(listing.seller.display_name)}</p>
<p><a href="{url}">Открыть на Lapki</a></p>
"""
    return HTMLResponse(_page(title, description, url, image, body_html))


@router.get("/events/{event_id}", response_class=HTMLResponse)
def prerender_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).options(joinedload(Event.organizer)).filter(Event.id == event_id).first()
    if not event:
        return HTMLResponse("<!doctype html><title>Не найдено</title>", status_code=404)

    kind = "Прогулка" if event.type == "walk" else "Событие"
    title = html.escape(f"{event.title} — Lapki")
    description = html.escape(_excerpt(event.description or event.title))
    url = html.escape(f"{SITE_URL}/events/{event.id}")

    body_html = f"""
<h1>{html.escape(event.title)}</h1>
<p><b>{html.escape(kind)}</b></p>
<p>{html.escape(event.description or "")}</p>
{f'<p>Место: {html.escape(event.location)}</p>' if event.location else ""}
<p>Организатор: {html.escape(event.organizer.display_name)}</p>
<p><a href="{url}">Открыть на Lapki</a></p>
"""
    return HTMLResponse(_page(title, description, url, DEFAULT_IMAGE, body_html))


@router.get("", response_class=HTMLResponse)
def prerender_home(db: Session = Depends(get_db)):
    """Главная — список последних публичных постов с ссылками, для индексации."""
    posts = db.query(Post).options(joinedload(Post.author)).order_by(desc(Post.created_at)).limit(30).all()

    items = "\n".join(
        f'<li><a href="{SITE_URL}/posts/{p.id}">{html.escape(p.title)}</a> — {html.escape(_excerpt(p.body, 100))}</li>'
        for p in posts
    )
    title = "Lapki — соцсеть для питомцев Белграда"
    description = "Потеряшки, находки, пристройство и услуги для владельцев животных в Белграде"
    body_html = f"<h1>{title}</h1><ul>{items}</ul>"
    return HTMLResponse(_page(html.escape(title), html.escape(description), SITE_URL, DEFAULT_IMAGE, body_html))
