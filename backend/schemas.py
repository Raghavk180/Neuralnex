"""SQLAlchemy tables. Matches section 5 of the architecture doc."""
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, Time,
)
from sqlalchemy.orm import relationship

from database import Base


def utcnow() -> datetime:
    """Naive UTC timestamp (works the same on SQLite and Postgres)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------- association tables (kept as models so we can query them directly) ----------
class UserTag(Base):
    __tablename__ = "user_tags"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class UserGroup(Base):
    __tablename__ = "user_groups"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)


class NoticeTag(Base):
    __tablename__ = "notice_tags"
    notice_id = Column(Integer, ForeignKey("notices.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class NoticeGroup(Base):
    __tablename__ = "notice_groups"
    notice_id = Column(Integer, ForeignKey("notices.id", ondelete="CASCADE"), primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)


# ---------- main tables ----------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(10), nullable=False, default="student")  # 'student' | 'admin'
    onboarded = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    tags = relationship("Tag", secondary="user_tags", lazy="selectin")
    groups = relationship("Group", secondary="user_groups", lazy="selectin")


class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)


class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    type = Column(String(20), nullable=False)  # 'club' | 'committee' | 'college'


class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(20), nullable=False)          # Events | Academics | General
    event_date = Column(Date, nullable=True)
    event_time = Column(Time, nullable=True)
    status = Column(String(10), nullable=False, default="draft", index=True)   # draft | published
    audience = Column(String(10), nullable=False, default="all")               # all | groups
    is_important = Column(Boolean, nullable=False, default=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    published_at = Column(DateTime, nullable=True)

    tags = relationship("Tag", secondary="notice_tags", lazy="selectin")
    groups = relationship("Group", secondary="notice_groups", lazy="selectin")
    saved = relationship("SavedNotice", back_populates="notice", cascade="all, delete-orphan")


class SavedNotice(Base):
    """Sticky notes. Primary key (user_id, notice_id) = a notice can be saved once per user."""
    __tablename__ = "saved_notices"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    notice_id = Column(Integer, ForeignKey("notices.id", ondelete="CASCADE"), primary_key=True)
    note_text = Column(String(300), nullable=True)
    color = Column(String(20), nullable=False, default="yellow")
    created_at = Column(DateTime, nullable=False, default=utcnow)

    notice = relationship("Notice", back_populates="saved")