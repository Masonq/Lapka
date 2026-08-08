from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.models import AuditLog, Pet, Post, Report, ServiceProvider, User
from app.schemas.schemas import AdminActionResult, AdminOverview, AuditLogOut, ReportQueueItem

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
    query = db.query(Report)
    if resolved is not None:
        query = query.filter(Report.is_resolved.is_(resolved))
    reports = query.order_by(desc(Report.created_at)).all()

    items = []
    for r in reports:
        item = ReportQueueItem.model_validate(r)
        if r.post:
            item.post.comments_count = len(r.post.comments)
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


@router.get("/audit-log", response_model=list[AuditLogOut])
def audit_log(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    rows = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(200).all()
    return rows
