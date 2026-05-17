from app.db.session import SessionLocal
from app.services.search_service import SearchService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def bootstrap():
    db = SessionLocal()
    try:
        search_service = SearchService(db)
        logger.info("Clearing existing search indices...")
        search_service.delete_indices()
        
        logger.info("Starting search index bootstrap...")
        search_service.bootstrap_index()
        logger.info("Search index bootstrap completed successfully.")
    except Exception as e:
        logger.error(f"Bootstrap failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    bootstrap()
