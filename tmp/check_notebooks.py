import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import SessionLocal
from app.models.notebook import Notebook

def check():
    db = SessionLocal()
    try:
        notebooks = db.query(Notebook).all()
        print(f"Total notebooks: {len(notebooks)}")
        for nb in notebooks:
            print(f"ID: {nb.id}, Title: {nb.title}, Published: {nb.is_published}")
    finally:
        db.close()

if __name__ == "__main__":
    check()
