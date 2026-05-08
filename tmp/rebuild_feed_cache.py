import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import SessionLocal
from app.services.trending_service import TrendingService

def rebuild():
    print("Rebuilding feed cache...")
    db = SessionLocal()
    try:
        trending_service = TrendingService(db)
        # Clear existing trending cache to start fresh
        print("Clearing 'trending:all' cache...")
        trending_service.redis.delete(TrendingService.KEY_TRENDING_ALL)
        trending_service.redis.delete(TrendingService.KEY_CACHE_BOOTSTRAPPED)
        
        # Recalculate all scores
        count = trending_service.recalculate_all_scores()
        print(f"Successfully bootstrapped feed with {count} notebooks.")
        
        # Set bootstrapped flag
        trending_service.redis.set(TrendingService.KEY_CACHE_BOOTSTRAPPED, "true")
        
    except Exception as e:
        print(f"Error rebuilding cache: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    rebuild()
