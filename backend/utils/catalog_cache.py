import copy
import json
import os
from typing import Any


DB_DIR = os.path.join(os.path.dirname(__file__), "..", "db")
CATALOG_FILES = (
    "centres.json",
    "recursos.json",
    "organitzacions.json",
    "projectes_caritas.json",
)

_CATALOG_CACHE: dict[str, Any] = {}


def _catalog_path(filename: str) -> str:
    return os.path.join(DB_DIR, filename)


def warm_catalog_cache(strict: bool = True) -> dict[str, int]:
    loaded: dict[str, int] = {}
    for filename in CATALOG_FILES:
        path = _catalog_path(filename)
        if not os.path.exists(path):
            if strict:
                raise RuntimeError(f"Missing catalog file: {filename}")
            continue

        with open(path, encoding="utf-8") as f:
            payload = json.load(f)

        _CATALOG_CACHE[filename] = payload
        loaded[filename] = len(payload) if isinstance(payload, list) else 1

    return loaded


def get_catalog(filename: str, clone: bool = True):
    if filename not in _CATALOG_CACHE:
        raise RuntimeError(
            f"Catalog '{filename}' was not preloaded. Call warm_catalog_cache() at startup."
        )
    data = _CATALOG_CACHE[filename]
    return copy.deepcopy(data) if clone else data
