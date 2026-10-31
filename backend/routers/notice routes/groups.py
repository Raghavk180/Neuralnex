from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from deps import get_db
from models import Group
from schemas import GroupOut

router = APIRouter(prefix="/api", tags=["groups"])


@router.get("/groups", response_model=List[GroupOut])
def list_groups(db: Session = Depends(get_db)):
    return db.query(Group).order_by(Group.type, Group.name).all()