#!/usr/bin/env python3
"""Create 10 password-auth test users and write credentials to repo root `jon.json`."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.profile import Profile
from app.models.user import User
from app.services.search_service import SearchService

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTFILE = REPO_ROOT / "jon.json"

# Shared password (min 8 chars for app registration rules)
PASSWORD = "jonpass12"

# Use @example.com — Pydantic EmailStr rejects reserved TLDs like .test (RFC 2606).
USERS = [
    ("jon01", "jon01@example.com"),
    ("jon02", "jon02@example.com"),
    ("jon03", "jon03@example.com"),
    ("jon04", "jon04@example.com"),
    ("jon05", "jon05@example.com"),
    ("jon06", "jon06@example.com"),
    ("jon07", "jon07@example.com"),
    ("jon08", "jon08@example.com"),
    ("jon09", "jon09@example.com"),
    ("jon10", "jon10@example.com"),
]

LEGACY_EMAIL_SUFFIX = "@example.test"


def main() -> None:
    db: Session = SessionLocal()
    accounts: list[dict[str, str]] = []

    try:
        pw_hash = hash_password(PASSWORD)
        for username, email in USERS:
            legacy_email = f"{username}{LEGACY_EMAIL_SUFFIX}"
            existing = (
                db.query(User).filter(User.username == username).first()
                or db.query(User).filter(User.email == email).first()
                or db.query(User).filter(User.email == legacy_email).first()
            )
            if existing:
                taken = (
                    db.query(User)
                    .filter(User.email == email, User.id != existing.id)
                    .first()
                )
                if taken:
                    raise RuntimeError(
                        f"Email {email!r} already used by user id {taken.id}"
                    )
                existing.username = username
                existing.email = email
                existing.password_hash = pw_hash
                existing.is_active = True
                existing.is_verified = True
                db.commit()
                db.refresh(existing)
                uid = existing.id
                if not db.query(Profile).filter(Profile.user_id == uid).first():
                    db.add(Profile(user_id=uid))
                    db.commit()
            else:
                conflict_u = db.query(User).filter(User.username == username).first()
                if conflict_u:
                    raise RuntimeError(f"Username {username!r} already taken")
                conflict_e = db.query(User).filter(User.email == email).first()
                if conflict_e:
                    raise RuntimeError(f"Email {email!r} already registered")
                user = User(
                    email=email,
                    username=username,
                    password_hash=pw_hash,
                    is_active=True,
                    is_verified=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                db.add(Profile(user_id=user.id))
                db.commit()

            u = (
                db.query(User)
                .options(joinedload(User.profile))
                .filter(User.username == username)
                .first()
            )
            if u:
                SearchService(db).index_user(u)

            accounts.append(
                {"username": username, "email": email, "password": PASSWORD}
            )

        payload = {
            "note": (
                "Test accounts for local/dev only. Do not use in production. "
                "Emails use @example.com because Pydantic rejects reserved domains like .test. "
                "Re-run this script after creating users so Meilisearch PEOPLE search stays in sync."
            ),
            "accounts": accounts,
        }
        OUTFILE.write_text(
            json.dumps(payload, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"Wrote {OUTFILE}")
        print(json.dumps(payload, indent=2))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
