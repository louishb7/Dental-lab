from __future__ import annotations

from collections import deque
from math import ceil
from threading import Lock
from time import time

from backend.core import settings

_attempts: dict[str, deque[float]] = {}
_lock = Lock()


def register_login_attempt(client_id: str) -> int | None:
    now = time()
    cutoff = now - settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS

    with _lock:
        attempts = _attempts.setdefault(client_id, deque())
        while attempts and attempts[0] < cutoff:
            attempts.popleft()

        if len(attempts) >= settings.LOGIN_RATE_LIMIT_ATTEMPTS:
            retry_after = ceil(settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS - (now - attempts[0]))
            return max(1, retry_after)

        attempts.append(now)
        return None


def reset_login_attempts(client_id: str | None = None) -> None:
    with _lock:
        if client_id is None:
            _attempts.clear()
            return
        _attempts.pop(client_id, None)
