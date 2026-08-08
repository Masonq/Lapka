from unittest.mock import patch

from fastapi import HTTPException

from app.core.rate_limit import RateLimiter


def test_allows_up_to_max_actions():
    limiter = RateLimiter(max_actions=3, window_seconds=60)
    for _ in range(3):
        limiter.check("user-1")  # не должно бросить


def test_blocks_after_max_actions():
    limiter = RateLimiter(max_actions=3, window_seconds=60)
    for _ in range(3):
        limiter.check("user-1")

    try:
        limiter.check("user-1")
        assert False, "должно было бросить 429"
    except HTTPException as e:
        assert e.status_code == 429


def test_different_keys_have_independent_limits():
    limiter = RateLimiter(max_actions=1, window_seconds=60)
    limiter.check("user-1")
    limiter.check("user-2")  # другой ключ — свой собственный лимит, не должно бросить


def test_window_resets_after_expiry():
    limiter = RateLimiter(max_actions=1, window_seconds=10)

    with patch("app.core.rate_limit.time.time", return_value=1000.0):
        limiter.check("user-1")

    # окно прошло — тот же ключ снова разрешён
    with patch("app.core.rate_limit.time.time", return_value=1011.0):
        limiter.check("user-1")  # не должно бросить


def test_stale_keys_are_swept_and_do_not_leak_memory():
    """Раньше self._hits был обычным dict без чистки — каждый уникальный IP/пользователь,
    который хоть раз обратился, оставался в памяти навсегда, даже когда его окно давно
    истекло. Проверяем, что процесс реально вычищает истёкшие ключи, а не просто
    позволяет им копиться бесконечно."""
    limiter = RateLimiter(max_actions=5, window_seconds=10)

    with patch("app.core.rate_limit.time.time", return_value=1000.0):
        limiter._last_sweep = 1000.0
        for i in range(50):
            limiter.check(f"visitor-{i}")

    assert len(limiter._hits) == 50

    # прошло намного больше окна — новый check() должен запустить sweep и вычистить всё старое
    with patch("app.core.rate_limit.time.time", return_value=1000.0 + 10 * 60):
        limiter.check("visitor-new")

    assert len(limiter._hits) == 1  # только что проверенный ключ, все остальные 50 вычищены
