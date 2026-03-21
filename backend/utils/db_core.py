import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "users.sqlite")


def get_conn(enable_foreign_keys: bool = False) -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA busy_timeout = 10000")
    if enable_foreign_keys:
        conn.execute("PRAGMA foreign_keys = ON")
    return conn
