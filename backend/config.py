"""Reads settings from .env once, so every other file just imports from here."""
import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./campusconnect.db")
# Supabase/Heroku style URLs start with postgres://, SQLAlchemy wants postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))

COOKIE_NAME = "access_token"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")  # use "none" + secure for cross-site deploys

FRONTEND_ORIGINS = [
    o.strip()
    for o in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

ADMIN_NAME = os.getenv("ADMIN_NAME", "Campus Admin")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@campus.edu")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin12345")