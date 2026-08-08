import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


def client_ip(request: Request) -> str:
    """IP клиента с учётом прокси. nginx подставляет реальный IP в X-Forwarded-For
    (см. deploy/nginx.conf); без него увидели бы только адрес самого nginx."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimiter:
    """Ограничивает число действий на пользователя за скользящее окно времени.

    Хранит состояние в памяти процесса — этого достаточно для одного бэкенд-инстанса
    (наш случай). Если бэкенд когда-нибудь станет многоинстансным, лимитер нужно будет
    перенести на общее хранилище (например Redis).
    """

    def __init__(self, max_actions: int, window_seconds: int):
        self.max_actions = max_actions
        self.window_seconds = window_seconds
        self._hits: dict[str, deque] = defaultdict(deque)

    def check(self, key: str):
        now = time.time()
        hits = self._hits[key]
        while hits and now - hits[0] > self.window_seconds:
            hits.popleft()
        if len(hits) >= self.max_actions:
            retry_after = int(self.window_seconds - (now - hits[0])) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Слишком много действий подряд — попробуй через {retry_after} сек.",
                headers={"Retry-After": str(retry_after)},
            )
        hits.append(now)


post_limiter = RateLimiter(max_actions=5, window_seconds=600)       # 5 постов за 10 минут
comment_limiter = RateLimiter(max_actions=20, window_seconds=600)   # 20 комментариев за 10 минут
pet_limiter = RateLimiter(max_actions=10, window_seconds=600)       # 10 питомцев за 10 минут
provider_limiter = RateLimiter(max_actions=3, window_seconds=600)   # 3 анкеты за 10 минут
review_limiter = RateLimiter(max_actions=10, window_seconds=600)    # 10 отзывов за 10 минут

# Эндпоинты входа доступны без токена, поэтому лимитируем по IP, а не по user_id —
# защита от перебора паролей и массовой регистрации ботами
login_limiter = RateLimiter(max_actions=10, window_seconds=900)     # 10 попыток входа за 15 минут с одного IP
register_limiter = RateLimiter(max_actions=5, window_seconds=3600)  # 5 регистраций за час с одного IP
