from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.i18n import get_lang, t
from app.core.rate_limit import story_limiter
from app.core.security import get_current_user
from app.models.models import Block, Story, User
from app.schemas.schemas import StoryCreate, StoryOut

router = APIRouter(prefix="/api/stories", tags=["stories"])

STORY_LIFETIME_HOURS = 24


@router.get("", response_model=list[StoryOut])
def list_stories(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Истории от тех, кого не заблокировал и кто не заблокировал тебя — те же
    правила видимости, что и для сообщений/подписок (см. Block)."""
    now = datetime.now(timezone.utc)

    blocked_ids = {
        b.blocked_id if b.blocker_id == user.id else b.blocker_id
        for b in db.query(Block).filter((Block.blocker_id == user.id) | (Block.blocked_id == user.id)).all()
    }

    query = db.query(Story).options(joinedload(Story.author)).filter(Story.expires_at > now)
    if blocked_ids:
        query = query.filter(~Story.author_id.in_(blocked_ids))

    return query.order_by(desc(Story.created_at)).all()


@router.post("", response_model=StoryOut)
def create_story(data: StoryCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    story_limiter.check(user.id)

    now = datetime.now(timezone.utc)
    story = Story(author_id=user.id, photo_url=data.photo_url, expires_at=now + timedelta(hours=STORY_LIFETIME_HOURS))
    db.add(story)
    db.commit()
    db.refresh(story)
    return story


@router.delete("/{story_id}")
def delete_story(
    story_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail=t("story_not_found", lang))
    if story.author_id != user.id:
        raise HTTPException(status_code=403, detail=t("can_only_delete_own_story", lang))
    db.delete(story)
    db.commit()
    return {"ok": True}
