"""Run once:  python seed.py     (safe to re-run; it skips what already exists)
Creates tables, tags, groups, the admin account (from .env), a demo student and sample notices."""
from datetime import date, time, timedelta

from config import ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD
from database import Base, SessionLocal, engine
from models import Group, Notice, Tag, User, utcnow
from security import hash_password

TAGS = ["Coding", "Sports", "Cultural", "Placements", "Academics", "Hackathons"]
GROUPS = [
    ("College (Official)", "college"),
    ("Computer Club", "club"),
    ("Cultural Committee", "committee"),
    ("Sports Committee", "committee"),
]
DEMO_STUDENT = {"name": "Demo Student", "email": "student@campus.edu", "password": "student123"}


def get_or_create(db, model, defaults=None, **lookup):
    obj = db.query(model).filter_by(**lookup).first()
    if obj:
        return obj
    obj = model(**lookup, **(defaults or {}))
    db.add(obj)
    db.flush()
    return obj


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        tags = {n: get_or_create(db, Tag, name=n) for n in TAGS}
        groups = {n: get_or_create(db, Group, name=n, defaults={"type": t}) for n, t in GROUPS}

        admin_email = ADMIN_EMAIL.lower()
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(name=ADMIN_NAME, email=admin_email, role="admin", onboarded=True,
                         password_hash=hash_password(ADMIN_PASSWORD))
            db.add(admin)
            db.flush()

        student = db.query(User).filter(User.email == DEMO_STUDENT["email"]).first()
        if not student:
            student = User(name=DEMO_STUDENT["name"], email=DEMO_STUDENT["email"], role="student",
                           onboarded=True, password_hash=hash_password(DEMO_STUDENT["password"]))
            student.tags = [tags["Coding"], tags["Hackathons"]]
            student.groups = [groups["Computer Club"], groups["College (Official)"]]
            db.add(student)
            db.flush()

        if db.query(Notice).count() == 0:
            today = date.today()
            now = utcnow()
            samples = [
                dict(title="Mid-semester exam schedule released", category="Academics",
                     description="The mid-sem timetable is on the academic portal. Check your slot and venue.",
                     event_date=today + timedelta(days=9), event_time=None, audience="all",
                     is_important=True, status="published", published_at=now - timedelta(days=1),
                     tags=["Academics"], groups=["College (Official)"]),
                dict(title="Annual Cultural Fest: auditions open", category="Events",
                     description="Auditions for dance, music and drama on Saturday. Register at the committee desk.",
                     event_date=today + timedelta(days=5), event_time=time(16, 0), audience="all",
                     is_important=False, status="published", published_at=now - timedelta(days=2),
                     tags=["Cultural"], groups=["Cultural Committee"]),
                dict(title="Inter-college Cricket trials", category="Events",
                     description="Trials at the main ground. Bring your own kit.",
                     event_date=today + timedelta(days=3), event_time=time(7, 30), audience="all",
                     is_important=False, status="published", published_at=now - timedelta(days=6),
                     tags=["Sports"], groups=["Sports Committee"]),
                dict(title="Hackathon prep session (Computer Club members)", category="Events",
                     description="Team formation and problem statement walkthrough for club members only.",
                     event_date=today + timedelta(days=2), event_time=time(18, 0), audience="groups",
                     is_important=True, status="published", published_at=now - timedelta(hours=5),
                     tags=["Coding", "Hackathons"], groups=["Computer Club"]),
                dict(title="Placement briefing: company list", category="General",
                     description="Draft announcement. Shortlisted companies will be confirmed soon.",
                     event_date=None, event_time=None, audience="all",
                     is_important=False, status="draft", published_at=None,
                     tags=["Placements"], groups=["College (Official)"]),
            ]
            for s in samples:
                tag_names, group_names = s.pop("tags"), s.pop("groups")
                n = Notice(created_by=admin.id, **s)
                n.tags = [tags[t] for t in tag_names]
                n.groups = [groups[g] for g in group_names]
                db.add(n)

        db.commit()
        print("Seed complete.")
        print(f"  Admin  : {admin_email} / {ADMIN_PASSWORD}")
        print(f"  Student: {DEMO_STUDENT['email']} / {DEMO_STUDENT['password']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()