import re
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from deps import get_current_user_optional, get_db
from models import Notice, User
from schemas import CalendarItem
from services.notices import fmt_time, visible_notices

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("", response_model=List[CalendarItem])
def month_calendar(
    month: str = Query(..., description="YYYY-MM, e.g. 2026-11"),
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    m = re.fullmatch(r"(\d{4})-(0[1-9]|1[0-2])", month)
    if not m:
        raise HTTPException(400, "month must look like 2026-11")
    year, mon = int(m.group(1)), int(m.group(2))
    start = date(year, mon, 1)
    end = date(year + 1, 1, 1) if mon == 12 else date(year, mon + 1, 1)

    # visibility rule applies here too: guests only get audience='all', drafts only for admins
    notices = (visible_notices(db, user)
               .filter(Notice.event_date.isnot(None),
                       Notice.event_date >= start, Notice.event_date < end)
               .all())

    # per day: all-day items first, then by time
    notices.sort(key=lambda n: (n.event_date, n.event_time is not None, n.event_time or 0, n.id))
    return [
        CalendarItem(
            id=n.id, title=n.title, category=n.category, event_date=n.event_date,
            event_time=fmt_time(n.event_time), all_day=n.event_time is None,
            status=n.status, is_important=n.is_important,
        )
        for n in notices
    ]