from typing import Iterable

from utils.partner_store import apply_volunteer_load_delta


def _extract_ids(voluntaris_assignats: Iterable[dict]):
    ids = {
        str(v.get("id", "")).strip()
        for v in voluntaris_assignats
        if isinstance(v, dict) and v.get("id")
    }
    return ids


def _apply_delta(voluntaris_assignats: Iterable[dict], delta: int):
    ids = _extract_ids(voluntaris_assignats)
    if not ids:
        return
    apply_volunteer_load_delta(ids, delta)


def increment_assigned_volunteers(voluntaris_assignats: Iterable[dict]):
    """Increment persones_actuals for assigned volunteers in local db file."""
    _apply_delta(voluntaris_assignats, 1)


def decrement_assigned_volunteers(voluntaris_assignats: Iterable[dict]):
    """Decrement persones_actuals for assigned volunteers in local db file."""
    _apply_delta(voluntaris_assignats, -1)
