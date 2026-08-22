"""배포(또는 배포에 준하는 로컬 테스트)용 설정. base.py + .envs/.env.prod."""

from .base import *  # noqa: F401,F403

DEBUG = False

# TODO: 실제 서버에 배포하기 전에 HTTPS 하드닝 설정을 켤 것.
# `uv run python manage.py check --deploy`가 안내해주는 항목들이다:
# SECURE_SSL_REDIRECT, SECURE_HSTS_SECONDS(+ INCLUDE_SUBDOMAINS/PRELOAD),
# SESSION_COOKIE_SECURE, CSRF_COOKIE_SECURE. 지금 당장 켜지 않은 이유는
# .envs/.env.prod가 아직 로컬(http://localhost)을 가리키고 있어서,
# SECURE_SSL_REDIRECT를 켜면 로컬에서 이 설정으로 테스트하는 게 아예
# 안 되기 때문이다 (모든 요청이 https로 리다이렉트됨).
