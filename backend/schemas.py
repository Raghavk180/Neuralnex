"""Pydantic request/response models + validation rules from section 6.4."""
from datetime import date, datetime, time
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

Category = Literal["Events", "Academics", "General"]
Color = Literal["yellow", "pink", "green", "blue", "orange"]


# ---------- auth / users ----------
class SignupIn(BaseModel):
    # No `role` field on purpose: extra keys (like role="admin") are ignored.
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    model_config = ConfigDict(str_strip_whitespace=True)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class TagOut(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


class GroupOut(BaseModel):
    id: int
    name: str
    type: str
    model_config = ConfigDict(from_attributes=True)


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    onboarded: bool
    tag_ids: List[int] = []
    group_ids: List[int] = []


class PreferencesIn(BaseModel):
    tag_ids: List[int] = Field(min_length=1)   # at least 1 interest tag
    group_ids: List[int] = []


# ---------- notices ----------
class NoticeIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    category: Category
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=1)
    event_date: Optional[date] = None      # "YYYY-MM-DD"
    event_time: Optional[time] = None      # "HH:MM"
    audience: Literal["all", "groups"] = "all"
    group_ids: List[int] = []
    tag_ids: List[int] = []
    is_important: bool = False

    @field_validator("event_date", "event_time", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        return None if v == "" else v   # form sends "" for an empty date/time

    @model_validator(mode="after")
    def _check_rules(self):
        if self.event_time is not None and self.event_date is None:
            raise ValueError("event_time can only be set when event_date is set")
        if self.audience == "groups" and not self.group_ids:
            raise ValueError("choose at least one club/committee when audience is 'groups'")
        return self


class NoticeOut(BaseModel):
    id: int
    title: str
    description: str
    category: str
    event_date: Optional[date] = None
    event_time: Optional[str] = None       # "HH:MM"
    status: str
    audience: str
    is_important: bool
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    tags: List[TagOut] = []
    groups: List[GroupOut] = []
    is_saved: Optional[bool] = None        # filled for logged-in students
    score: Optional[int] = None            # filled by /explore only


class NoticePage(BaseModel):
    items: List[NoticeOut]
    total: int
    page: int
    page_size: int


class CalendarItem(BaseModel):
    id: int
    title: str
    category: str
    event_date: date
    event_time: Optional[str] = None
    all_day: bool
    status: str                            # admins can see 'draft' items
    is_important: bool


# ---------- sticky notes ----------
class SavedIn(BaseModel):
    note_text: Optional[str] = Field(default=None, max_length=300)
    color: Color = "yellow"


class SavedOut(BaseModel):
    note_text: Optional[str]
    color: str
    created_at: datetime
    notice: NoticeOut