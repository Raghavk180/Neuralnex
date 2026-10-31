"""Password hashing, JWT helpers and a tiny login rate limiter."""
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import HTTPException
from jose import JWTError, jwt

from config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY


# ---------- passwords (bcrypt used directly; avoids the passlib/bcrypt 4.x version clash) ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode("utf-8"))
    except ValueError:
        return False


# ---------- JWT ----------
def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[int]:
    """Returns the user id, or None if the token is bad/expired."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None


# ---------- login rate limit (in memory: resets on restart, per process) ----------
class LoginRateLimiter:
    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window = window_seconds
        self.failures = defaultdict(deque)

    def _prune(self, key: str):
        q = self.failures[key]
        cutoff = time.monotonic() - self.window
        while q and q[0] < cutoff:
            q.popleft()

    def check(self, key: str):
        self._prune(key)
        if len(self.failures[key]) >= self.max_attempts:
            raise HTTPException(429, "Too many failed attempts. Try again in a few minutes.")

    def record_failure(self, key: str):
        self.failures[key].append(time.monotonic())

    def reset(self, key: str):
        self.failures.pop(key, None)


login_limiter = LoginRateLimiter()