"""Public notice endpoints (/api/notices) and admin endpoints (/api/admin/notices)."""
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from deps import get_current_user_optional, get_db, require_admin, require_student
from models import Group, Notice, Tag, User, utcnow
from schemas import Category, NoticeIn, NoticeOut, NoticePage
from services.notices import (
    apply_filters, get_visible_notice_or_404, load_by_ids, notice_to_out,
    paginate, ranked_notices, saved_ids_for, visible_notices,
)

router = APIRouter(prefix="/api/notices", tags=["notices"])
admin_router = APIRouter(prefix="/api/admin/notices", tags=["admin"])

PAGE_SIZE_DEFAULT = 20


def _order_newest(q):
    return q.order_by(func.coalesce(Notice.published_at, Notice.created_at).desc(), Notice.id.desc())


# =============================================================== public / student
@router.get("", response_model=NoticePage)
def list_notices(
    q: Optional[str] = None,
    category: Optional[Category] = None,
    group_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(PAGE_SIZE_DEFAULT, ge=1, le=100),
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    query = apply_filters(visible_notices(db, user), q, category, group_id)
    items, total = paginate(_order_newest(query), page, page_size)
    saved = saved_ids_for(db, user)
    return NoticePage(items=[notice_to_out(n, saved) for n in items],
                      total=total, page=page, page_size=page_size)


# NOTE: /explore must be declared BEFORE /{notice_id}, otherwise "explore" is read as an id.
@router.get("/explore", response_model=NoticePage)
def explore(
    q: Optional[str] = None,
    category: Optional[Category] = None,
    group_id: Optional[int] = None,
    only_my_interests: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(PAGE_SIZE_DEFAULT, ge=1, le=100),
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    query = apply_filters(visible_notices(db, user), q, category, group_id)
    ranked = ranked_notices(query.all(), user, only_my_interests)   # scored in Python (6.2)

    total = len(ranked)
    start = (page - 1) * page_size
    window = ranked[start:start + page_size]
    saved = saved_ids_for(db, user)
    return NoticePage(items=[notice_to_out(n, saved, score) for n, score in window],
                      total=total, page=page, page_size=page_size)


@router.get("/{notice_id}", response_model=NoticeOut)
def get_notice(
    notice_id: int,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    notice = get_visible_notice_or_404(db, user, notice_id)
    return notice_to_out(notice, saved_ids_for(db, user))


# =============================================================== admin
def _apply_payload(db: Session, notice: Notice, data: NoticeIn):
    """Copies validated request data onto a Notice (used by create and edit)."""
    notice.title = data.title
    notice.description = data.description
    notice.category = data.category
    notice.event_date = data.event_date
    notice.event_time = data.event_time if data.event_date else None
    notice.audience = data.audience
    notice.is_important = data.is_important
    # Groups are always stored (so "Official" filter works even for audience='all');
    # only audience='groups' actually restricts who can see the notice.
    notice.groups = load_by_ids(db, Group, data.group_ids, "group")
    notice.tags = load_by_ids(db, Tag, data.tag_ids, "tag")


@admin_router.get("", response_model=NoticePage)
def admin_list(
    status: Optional[Literal["draft", "published"]] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(PAGE_SIZE_DEFAULT, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = apply_filters(visible_notices(db, admin), q)
    if status:
        query = query.filter(Notice.status == status)
    items, total = paginate(_order_newest(query), page, page_size)
    return NoticePage(items=[notice_to_out(n) for n in items],
                      total=total, page=page, page_size=page_size)


@admin_router.post("", response_model=NoticeOut, status_code=201)
def create_notice(data: NoticeIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    notice = Notice(status="draft", created_by=admin.id)       # always starts as a draft
    _apply_payload(db, notice, data)
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice_to_out(notice)


@admin_router.put("/{notice_id}", response_model=NoticeOut)
def edit_notice(notice_id: int, data: NoticeIn, admin: User = Depends(require_admin),
                db: Session = Depends(get_db)):
    notice = get_visible_notice_or_404(db, admin, notice_id)   # admin => finds drafts too
    _apply_payload(db, notice, data)                           # allowed in draft or published
    notice.updated_at = utcnow()
    db.commit()
    db.refresh(notice)
    return notice_to_out(notice)


@admin_router.post("/{notice_id}/publish", response_model=NoticeOut)
def publish_notice(notice_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    notice = get_visible_notice_or_404(db, admin, notice_id)
    if notice.status != "published":
        notice.status = "published"
        notice.published_at = utcnow()
        db.commit()
        db.refresh(notice)
    return notice_to_out(notice)


@admin_router.post("/{notice_id}/unpublish", response_model=NoticeOut)
def unpublish_notice(notice_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    notice = get_visible_notice_or_404(db, admin, notice_id)
    notice.status = "draft"
    notice.published_at = None
    db.commit()
    db.refresh(notice)
    return notice_to_out(notice)


@admin_router.delete("/{notice_id}", status_code=204)
def delete_notice(notice_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    notice = get_visible_notice_or_404(db, admin, notice_id)
    db.delete(notice)          # saved sticky notes + tag/group links cascade away
    db.commit()