"""Sticky notes: a student's personal board of saved notices (6.6)."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from deps import get_db, require_student
from models import Notice, SavedNotice, User
from schemas import SavedIn, SavedOut
from services.notices import get_visible_notice_or_404, notice_to_out, visible_notices

router = APIRouter(prefix="/api/saved", tags=["saved"])


def _to_out(saved: SavedNotice) -> SavedOut:
    return SavedOut(
        note_text=saved.note_text,
        color=saved.color,
        created_at=saved.created_at,
        notice=notice_to_out(saved.notice, saved_ids={saved.notice_id}),
    )


@router.get("", response_model=List[SavedOut])
def list_saved(user: User = Depends(require_student), db: Session = Depends(get_db)):
    # Re-apply visibility: unpublished / restricted-away notices vanish from the board.
    still_visible = select(visible_notices(db, user).with_entities(Notice.id).subquery().c.id)
    rows = (db.query(SavedNotice)
              .filter(SavedNotice.user_id == user.id, SavedNotice.notice_id.in_(still_visible))
              .order_by(SavedNotice.created_at.desc())
              .all())
    return [_to_out(r) for r in rows]


@router.put("/{notice_id}", response_model=SavedOut)
def save_notice(notice_id: int, data: SavedIn, user: User = Depends(require_student),
                db: Session = Depends(get_db)):
    """Save a notice, or update its note/colour if already saved."""
    get_visible_notice_or_404(db, user, notice_id)      # can't save what you can't see
    saved = db.get(SavedNotice, (user.id, notice_id))
    if saved is None:
        saved = SavedNotice(user_id=user.id, notice_id=notice_id)
        db.add(saved)
    saved.note_text = (data.note_text or "").strip() or None
    saved.color = data.color
    db.commit()
    db.refresh(saved)
    return _to_out(saved)


@router.delete("/{notice_id}", status_code=204)
def unsave_notice(notice_id: int, user: User = Depends(require_student), db: Session = Depends(get_db)):
    saved = db.get(SavedNotice, (user.id, notice_id))
    if saved is None:
        raise HTTPException(404, "Not in your sticky notes")
    db.delete(saved)
    db.commit()