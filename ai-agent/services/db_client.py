import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/refundshield")

class DatabaseClient:
    _client = None
    _db = None

    @classmethod
    def get_db(cls):
        if cls._db is None:
            cls._client = MongoClient(MONGODB_URI)
            # Extract database name from URI or default to refundshield
            db_name = "refundshield"
            if "/" in MONGODB_URI:
                parts = MONGODB_URI.split("://")[1].split("/")
                if len(parts) > 1 and parts[1]:
                    db_name = parts[1].split("?")[0]
            cls._db = cls._client[db_name]
        return cls._db

def get_db():
    return DatabaseClient.get_db()
