from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.profile import Profile

def seed():
    db = SessionLocal()
    try:
        # Check if user 1 exists
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            print("Creating test user with ID 1...")
            user = User(
                id=1,
                email="testuser@example.com",
                username="testuser",
                password_hash="test",
                is_active=True,
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"User 1 created: {user.username}")
        else:
            print(f"User 1 already exists: {user.username}")

        # Check if profile exists
        profile = db.query(Profile).filter(Profile.user_id == 1).first()
        if not profile:
            print("Creating profile for user 1...")
            profile = Profile(
                user_id=1,
                username="testuser",
                bio="Automated test user profile",
                avatar_url=None
            )
            db.add(profile)
            db.commit()
            print("Profile created.")
        else:
            print("Profile already exists.")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
