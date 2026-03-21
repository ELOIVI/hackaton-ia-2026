import os
import sqlite3
import threading

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "users.sqlite")
_sqlite_setup_lock = threading.Lock()
_sqlite_setup_done = False


def initialize_sqlite_db_settings() -> None:
    global _sqlite_setup_done
    with _sqlite_setup_lock:
        if _sqlite_setup_done:
            return

        conn = sqlite3.connect(DB_PATH, timeout=10)
        try:
            conn.execute("PRAGMA journal_mode = WAL")
            conn.execute("PRAGMA synchronous = NORMAL")
        finally:
            conn.close()

        _sqlite_setup_done = True


def get_conn(enable_foreign_keys: bool = False) -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 10000")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn
