#!/usr/bin/env python3
"""Create a test user for E2E testing"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.profile import Profile
from app.core.security import hash_password

def create_test_user():
    """Create a test user with known credentials"""
    db: Session = SessionLocal()

    try:
        # Check if test user already exists
        existing_user = db.query(User).filter(User.email == "test@example.com").first()

        if existing_user:
            print(f"Test user already exists: {existing_user.username} ({existing_user.email})")
            # Update password if needed
            existing_user.password_hash = hash_password("testpassword123")
            db.commit()
            print("Updated test user password")
            return

        # Create new test user
        test_user = User(
            email="test@example.com",
            username="testuser",
            password_hash=hash_password("testpassword123"),
            is_active=True,
            is_verified=True
        )

        db.add(test_user)
        db.commit()
        db.refresh(test_user)

        # Create profile
        profile = Profile(
            user_id=test_user.id,
            bio="Test user for E2E testing",
        )
        db.add(profile)
        db.commit()

        print(f"✅ Test user created successfully!")
        print(f"   Email: test@example.com")
        print(f"   Password: testpassword123")
        print(f"   Username: testuser")
        print(f"   User ID: {test_user.id}")

    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()
