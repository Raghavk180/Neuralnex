from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from config import ACCESS_TOKEN_EXPIRE_MINUTES, COOKIE_NAME, COOKIE_SAMESITE, COOKIE_SECURE
from deps import get_current_user, get_db
from models import User
from schemas import LoginIn, SignupIn, UserOut
from security import create_access_token, hash_password, login_limiter, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def user_to_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        onboarded=user.onboarded,
        tag_ids=[t.id for t in user.tags],
        group_ids=[g.id for g in user.groups],
    )


def set_login_cookie(response: Response, user_id: int):
    response.set_cookie(
        key=COOKIE_NAME,
        value=create_access_token(user_id),
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,                 # JS can't read it -> safer against XSS
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
    )


@router.post("/signup", response_model=UserOut, status_code=201)
def signup(data: SignupIn, response: Response, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "An account with this email already exists")

    # role is ALWAYS 'student' here; the request body can't change it.
    user = User(name=data.name, email=email, password_hash=hash_password(data.password),
                role="student", onboarded=False)
    db.add(user)
    db.commit()
    db.refresh(user)

    set_login_cookie(response, user.id)     # log them in so they can go straight to onboarding
    return user_to_out(user)


@router.post("/login", response_model=UserOut)
def login(data: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    email = data.email.lower()
    key = f"{request.client.host if request.client else 'unknown'}:{email}"
    login_limiter.check(key)

    user = db.query(User).filter(User.email == email).first()
    if user is None or not verify_password(data.password, user.password_hash):
        login_limiter.record_failure(key)
        raise HTTPException(401, "Incorrect email or password")

    login_limiter.reset(key)
    set_login_cookie(response, user.id)
    return user_to_out(user)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user_to_out(user)