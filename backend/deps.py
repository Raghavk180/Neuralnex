"""FastAPI dependencies: db session, current user, role guards."""
from typing import Optional

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from config import COOKIE_NAME
from database import SessionLocal
from models import User
from security import decode_access_token


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Guest -> None. Used by endpoints that work for everyone."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    user_id = decode_access_token(token)
    if user_id is None:
        return None
    return db.get(User, user_id)


def get_current_user(user: Optional[User] = Depends(get_current_user_optional)) -> User:
    if user is None:
        raise HTTPException(401, "Not logged in")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Admins only")
    return user


def require_student(user: User = Depends(get_current_user)) -> User:
    if user.role != "student":
        raise HTTPException(403, "Students only")
    return user