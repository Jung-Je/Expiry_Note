"""refresh token을 httpOnly 쿠키로 주고받기 위한 헬퍼.

access token은 응답 바디로 내려주고 프론트가 메모리에만 들고 있는 반면,
refresh token은 JS가 아예 접근할 수 없는 httpOnly 쿠키로만 오간다 — XSS로
access token이 새더라도 수명이 훨씬 긴 refresh token까지 같이 새지 않게
하기 위함.
"""

from django.conf import settings
from rest_framework.response import Response


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        refresh_token,
        httponly=True,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
        path=settings.JWT_REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        path=settings.JWT_REFRESH_COOKIE_PATH,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
    )
