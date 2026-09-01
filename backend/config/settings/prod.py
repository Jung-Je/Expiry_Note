"""배포(또는 배포에 준하는 로컬 테스트)용 설정. base.py + .envs/.env.prod."""

from .base import *  # noqa: F401,F403

DEBUG = False

# HTTPS 하드닝. `uv run python manage.py check --deploy`가 안내해주는 항목들.
# 기본값은 켜짐(실제 배포는 항상 HTTPS 뒤에 있음) — Docker Compose로 로컬에서
# http로 이 설정을 테스트해야 한다면 DJANGO_SECURE_SSL_REDIRECT=False 등으로
# .envs/.env.prod에서 개별적으로 끌 수 있다.
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
# 30일부터 시작 — 문제없이 몇 주 운영되는 걸 확인한 뒤 늘리는 걸 권장.
# PRELOAD는 브라우저 내장 목록 등록이라 되돌리기 어려우므로 기본 False로 둠.
SECURE_HSTS_SECONDS = env.int("DJANGO_SECURE_HSTS_SECONDS", default=60 * 60 * 24 * 30)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
SECURE_HSTS_PRELOAD = env.bool("DJANGO_SECURE_HSTS_PRELOAD", default=False)
SESSION_COOKIE_SECURE = env.bool("DJANGO_SESSION_COOKIE_SECURE", default=True)
CSRF_COOKIE_SECURE = env.bool("DJANGO_CSRF_COOKIE_SECURE", default=True)

# Rate limiting(ScopedRateThrottle)용 캐시. 기본(LocMemCache)은 프로세스
# 로컬이라 멀티 워커(gunicorn --workers 3 등)에서는 워커마다 카운트가 따로
# 쌓여 제한이 느슨해진다 — docker-compose.prod.yml의 redis 서비스를 공유
# 캐시로 써서 워커 전체가 같은 카운트를 본다.
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://redis:6379/0"),
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    },
}
