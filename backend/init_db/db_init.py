import os
import sys
from pathlib import Path
from typing import Optional

import psycopg2
from core.db import initialize_database

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

if __name__ == "__main__":
    DB_CONFIG: dict[str, Optional[str]] = {
        "host": os.getenv("POSTGRES_HOST", "127.0.0.1"),
        "port": os.getenv("POSTGRES_PORT"),
        "user": os.getenv("POSTGRES_USER"),
        "password": os.getenv("POSTGRES_PASSWORD"),
        "dbname": os.getenv("POSTGRES_DB"),
    }

    conn = psycopg2.connect(
        host=DB_CONFIG.get("host"),
        database=DB_CONFIG.get("dbname"),
        password=DB_CONFIG.get("password"),
        user=DB_CONFIG.get("user"),
        port=DB_CONFIG.get("port"),
    )
    cur = conn.cursor()
    initialize_database(init_conn=conn, init_cur=cur)
    print("Database initialized for tests")
