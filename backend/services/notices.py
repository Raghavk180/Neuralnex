"""Core business logic: visibility (6.1), filters/search (6.3), explore ranking (6.2)."""
from datetime import timedelta
from typing import Iterable, List, Optional, Set

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Query, Session

from models import Notice, NoticeGroup, SavedNotice, User, UserGroup, utcnow
from schemas import GroupOut, NoticeOut, TagOut


# ---------------------------------------------------------------- 6.1 visibility
def visible_notices(db: Session, user: Optional[User]) -> Query:
    """EVERY read endpoint must start from this. Never query Notice directly for readers."""
    q = db.query(Notice)
    if user is not None and user.role == "admin":
        return q                                             # admins see all, drafts included

    q = q.filter(Notice.status == "published")
    if user is None:
        return q.filter(Notice.audience == "all")            # guests: public notices only

    my_groups = select(UserGroup.group_id).where(UserGroup.user_id == user.id)
    in_my_groups = select(NoticeGroup.notice_id).where(NoticeGroup.group_id.in_(my_groups))
    return q.filter(or_(Notice.audience == "all", Notice.id.in_(in_my_groups)))


def get_visible_notice_or_404(db: Session, user: Optional[User], notice_id: int) -> Notice:
    """404 (not 403) when it exists but the viewer may not see it."""
    notice = visible_notices(db, user).filter(Notice.id == notice_id).first()
    if notice is None:
        raise HTTPException(404, "Notice not found")
    return notice


# ---------------------------------------------------------------- 6.3 filters + search
def _like_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def apply_filters(
    q: Query,
    search: Optional[str] = None,
    category: Optional[str] = None,
    group_id: Optional[int] = None,
) -> Query:
    """Filters combine with AND. The group filter means 'notice is tied to this group'."""
    if search and search.strip():
        pattern = f"%{_like_escape(search.strip())}%"
        q = q.filter(or_(
            Notice.title.ilike(pattern, escape="\\"),
            Notice.description.ilike(pattern, escape="\\"),
        ))
    if category:
        q = q.filter(Notice.category == category)
    if group_id is not None:
        tied = select(NoticeGroup.notice_id).where(NoticeGroup.group_id == group_id)
        q = q.filter(Notice.id.in_(tied))
    return q


def paginate(q: Query, page: int, page_size: int):
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


# ---------------------------------------------------------------- 6.2 explore ranking
def score_notice(notice: Notice, my_tag_ids: Set[int], now) -> int:
    matches = sum(1 for t in notice.tags if t.id in my_tag_ids)
    score = 3 * matches
    if notice.is_important:
        score += 2
    if notice.published_at is not None:
        age = now - notice.published_at
        if age <= timedelta(days=3):
            score += 2
        elif age <= timedelta(days=7):
            score += 1
    return score


def ranked_notices(candidates: Iterable[Notice], user: User, only_my_interests: bool = False):
    """Returns [(notice, score)] sorted by score DESC, published_at DESC."""
    my_tag_ids = {t.id for t in user.tags}
    now = utcnow()
    rows = []
    for n in candidates:
        if only_my_interests and not any(t.id in my_tag_ids for t in n.tags):
            continue
        rows.append((n, score_notice(n, my_tag_ids, now)))
    rows.sort(key=lambda r: (r[1], r[0].published_at or r[0].created_at), reverse=True)
    return rows


# ---------------------------------------------------------------- helpers shared by routers
def saved_ids_for(db: Session, user: Optional[User]) -> Optional[Set[int]]:
    """Set of notice ids this student saved; None for guests/admins (is_saved stays null)."""
    if user is None or user.role != "student":
        return None
    rows = db.query(SavedNotice.notice_id).filter(SavedNotice.user_id == user.id).all()
    return {r[0] for r in rows}


def fmt_time(t) -> Optional[str]:
    return t.strftime("%H:%M") if t else None


def notice_to_out(n: Notice, saved_ids: Optional[Set[int]] = None, score: Optional[int] = None) -> NoticeOut:
    return NoticeOut(
        id=n.id,
        title=n.title,
        description=n.description,
        category=n.category,
        event_date=n.event_date,
        event_time=fmt_time(n.event_time),
        status=n.status,
        audience=n.audience,
        is_important=n.is_important,
        created_at=n.created_at,
        updated_at=n.updated_at,
        published_at=n.published_at,
        tags=[TagOut.model_validate(t) for t in n.tags],
        groups=[GroupOut.model_validate(g) for g in n.groups],
        is_saved=(n.id in saved_ids) if saved_ids is not None else None,
        score=score,
    )


def load_by_ids(db: Session, model, ids: List[int], label: str):
    """Fetch rows for a list of ids; 400 if any id doesn't exist."""
    unique = list(set(ids))
    if not unique:
        return []
    rows = db.query(model).filter(model.id.in_(unique)).all()
    if len(rows) != len(unique):
        raise HTTPException(400, f"Unknown {label} id in request")
    return rows