import time
from collections import defaultdict, deque
from functools import wraps
from threading import Lock

from flask import jsonify, request


_BUCKETS: dict[str, deque] = defaultdict(deque)
_LOCK = Lock()


def rate_limited(max_requests: int, window_seconds: int):
    """Simple in-memory rate limiter per IP + endpoint."""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
            endpoint = request.path
            now = time.time()
            key = f"{client_ip}:{endpoint}"

            with _LOCK:
                bucket = _BUCKETS[key]
                while bucket and now - bucket[0] > window_seconds:
                    bucket.popleft()

                if len(bucket) >= max_requests:
                    retry_after = int(window_seconds - (now - bucket[0])) if bucket else window_seconds
                    return (
                        jsonify(
                            {
                                "error": "Massa peticions. Torna-ho a provar en uns segons.",
                                "retry_after_seconds": max(retry_after, 1),
                            }
                        ),
                        429,
                    )

                bucket.append(now)

            return func(*args, **kwargs)

        return wrapper

    return decorator
