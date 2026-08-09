from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.models import AuditLog, Comment, Listing, Pet, Post, Report, ServiceProvider, User
from app.schemas.schemas import AdminActionResult, AdminOverview, AdminUserOut, AuditLogOut, ReportQueueItem, ServiceProviderOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _log(db: Session, admin: User, action: str, target_type: str, target_id: Optional[str], note: Optional[str] = None):
    db.add(AuditLog(admin_id=admin.id, action=action, target_type=target_type, target_id=target_id, note=note))


@router.get("/overview", response_model=AdminOverview)
def overview(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return AdminOverview(
        users_count=db.query(User).count(),
        posts_count=db.query(Post).count(),
        pets_count=db.query(Pet).count(),
        unresolved_reports_count=db.query(Report).filter(Report.is_resolved.is_(False)).count(),
        service_providers_count=db.query(ServiceProvider).count(),
    )


@router.get("/reports", response_model=list[ReportQueueItem])
def list_reports(
    resolved: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(Report).options(
        joinedload(Report.reporter), joinedload(Report.post), joinedload(Report.listing)
    )
    if resolved is not None:
        query = query.filter(Report.is_resolved.is_(resolved))
    reports = query.order_by(desc(Report.created_at)).all()

    post_ids = [r.post_id for r in reports if r.post_id]
    comment_counts = {}
    if post_ids:
        rows = (
            db.query(Comment.post_id, func.count(Comment.id))
            .filter(Comment.post_id.in_(post_ids))
            .group_by(Comment.post_id)
            .all()
        )
        comment_counts = dict(rows)

    items = []
    for r in reports:
        item = ReportQueueItem.model_validate(r)
        if r.post:
            item.post.comments_count = comment_counts.get(r.post_id, 0)
        items.append(item)
    return items


@router.patch("/reports/{report_id}/dismiss", response_model=AdminActionResult)
def dismiss_report(report_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    """Жалоба рассмотрена, но контент оставлен — например, при повторной/необоснованной жалобе."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Жалоба не найдена")

    report.is_resolved = True
    _log(db, admin, "dismiss_report", "report", report_id)
    db.commit()
    return AdminActionResult()


@router.delete("/posts/{post_id}", response_model=AdminActionResult)
def admin_delete_post(post_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    """В отличие от DELETE /api/posts/{id} — админ может удалить любой пост, не только свой.
    Связанные жалобы остаются (post_id уходит в NULL), остальное (сохранения, уведомления,
    комментарии) удаляется каскадом вместе с постом."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")

    db.query(Report).filter(Report.post_id == post_id, Report.is_resolved.is_(False)).update(
        {"is_resolved": True}
    )
    _log(db, admin, "delete_post", "post", post_id, note=post.title[:200])
    db.delete(post)
    db.commit()
    return AdminActionResult()


@router.delete("/listings/{listing_id}", response_model=AdminActionResult)
def admin_delete_listing(listing_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    """Как admin_delete_post — админ может удалить любое объявление, не только своё
    (у продавцов такого права нет ни на чужие объявления). Связанные жалобы остаются
    (listing_id уходит в NULL), сохранения удаляются каскадом вместе с объявлением."""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")

    db.query(Report).filter(Report.listing_id == listing_id, Report.is_resolved.is_(False)).update(
        {"is_resolved": True}
    )
    _log(db, admin, "delete_listing", "listing", listing_id, note=listing.title[:200])
    db.delete(listing)
    db.commit()
    return AdminActionResult()


@router.get("/audit-log", response_model=list[AuditLogOut])
def audit_log(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    rows = (
        db.query(AuditLog)
        .options(joinedload(AuditLog.admin))
        .order_by(desc(AuditLog.created_at))
        .limit(200)
        .all()
    )
    return rows


@router.get("/users", response_model=list[AdminUserOut])
def list_users(
    q: Optional[str] = None,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(User)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter((User.display_name.ilike(pattern)) | (User.email.ilike(pattern)))
    users = query.order_by(desc(User.created_at)).offset(offset).limit(limit).all()
    if not users:
        return []

    user_ids = [u.id for u in users]
    posts_counts = dict(
        db.query(Post.author_id, func.count(Post.id)).filter(Post.author_id.in_(user_ids)).group_by(Post.author_id).all()
    )
    pets_counts = dict(
        db.query(Pet.owner_id, func.count(Pet.id)).filter(Pet.owner_id.in_(user_ids)).group_by(Pet.owner_id).all()
    )

    out = []
    for u in users:
        item = AdminUserOut.model_validate(u)
        item.posts_count = posts_counts.get(u.id, 0)
        item.pets_count = pets_counts.get(u.id, 0)
        out.append(item)
    return out


@router.get("/service-providers", response_model=list[ServiceProviderOut])
def list_service_providers(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return (
        db.query(ServiceProvider)
        .options(joinedload(ServiceProvider.user))
        .order_by(ServiceProvider.is_verified, desc(ServiceProvider.rating_avg))
        .all()
    )


@router.patch("/service-providers/{provider_id}/verify", response_model=ServiceProviderOut)
def toggle_verify_provider(
    provider_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)
):
    """Раздел 18 блюпринта — verified badge. Переключатель (не только 'включить') —
    удобно снять статус, если позже выяснится, что подтверждали ошибочно."""
    provider = db.query(ServiceProvider).filter(ServiceProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Анкета исполнителя не найдена")

    provider.is_verified = not provider.is_verified
    _log(
        db, admin, "verify_provider" if provider.is_verified else "unverify_provider",
        "service_provider", provider_id,
    )
    db.commit()
    db.refresh(provider)
    return provider
