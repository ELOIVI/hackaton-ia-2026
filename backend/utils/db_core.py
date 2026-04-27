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

        # Increase SQLite timeouts to reduce lock contention under concurrent writes.
        conn = sqlite3.connect(DB_PATH, timeout=20)
        try:
            conn.execute("PRAGMA journal_mode = WAL")
            conn.execute("PRAGMA synchronous = NORMAL")
        finally:
            conn.close()

        _sqlite_setup_done = True


def get_conn(enable_foreign_keys: bool = False) -> sqlite3.Connection:
    # Increase SQLite timeouts to reduce lock contention under concurrent writes.
    conn = sqlite3.connect(DB_PATH, timeout=20)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 20000")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


initialize_sqlite_db_settings()
