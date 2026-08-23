"""로그인/비밀번호 재설정/카카오 로그인 등 AllowAny 인증 엔드포인트의
IP 기준 rate limiting(ScopedRateThrottle)을 검증한다.

`ScopedRateThrottle.THROTTLE_RATES`는 `rest_framework.throttling` 모듈이 처음
import될 때 `api_settings.DEFAULT_THROTTLE_RATES` 값을 한 번 복사해 클래스
속성으로 굳혀버린다 — 이후 Django settings를 오버라이드해도(`settings`
픽스처, `override_settings`) 이 클래스 속성까지 갱신되지는 않는다. 그래서
`settings.REST_FRAMEWORK`가 아니라 `ScopedRateThrottle.THROTTLE_RATES`
클래스 속성 자체를 `monkeypatch`로 덮어써서 테스트마다 낮은 rate를
결정적으로 강제한다.

실제 운영 rate는 `config/settings/base.py`의
`REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`에 있다.
"""

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.models import User


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


def _set_rate(monkeypatch: pytest.MonkeyPatch, scope: str, rate: str) -> None:
    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", {scope: rate})


@pytest.mark.django_db
def test_login_is_rate_limited_per_ip(monkeypatch):
    _set_rate(monkeypatch, "auth-login", "2/min")
    User.objects.create_user(
        email="brute@example.com", password="right-strong-pass-1", name="테스트"
    )
    client = APIClient()
    payload = {"email": "brute@example.com", "password": "wrong-password"}

    for _ in range(2):
        response = client.post("/api/v1/auth/login/", payload)
        assert response.status_code == 401

    throttled = client.post("/api/v1/auth/login/", payload)
    assert throttled.status_code == 429


@pytest.mark.django_db
def test_password_reset_request_is_rate_limited_per_ip(monkeypatch):
    _set_rate(monkeypatch, "auth-password-reset-request", "1/min")
    client = APIClient()

    first = client.post("/api/v1/auth/password/reset/", {"email": "nobody@example.com"})
    assert first.status_code == 200

    throttled = client.post("/api/v1/auth/password/reset/", {"email": "nobody@example.com"})
    assert throttled.status_code == 429


@pytest.mark.django_db
def test_signup_is_rate_limited_per_ip(monkeypatch):
    _set_rate(monkeypatch, "auth-signup", "1/min")
    client = APIClient()
    payload = {
        "email": "new-signup@example.com",
        "password": "a-strong-pass-1",
        "password_confirm": "a-strong-pass-1",
        "name": "테스트",
    }

    first = client.post("/api/v1/auth/signup/", payload)
    assert first.status_code == 201

    throttled = client.post(
        "/api/v1/auth/signup/", {**payload, "email": "another-signup@example.com"}
    )
    assert throttled.status_code == 429


@pytest.mark.django_db
def test_unthrottled_views_are_unaffected():
    # throttle_scope가 없는 뷰(예: me/)는 ScopedRateThrottle이 그냥 통과시킨다.
    user = User.objects.create_user(
        email="normal@example.com", password="a-strong-pass-1", name="테스트"
    )
    client = APIClient()
    client.force_authenticate(user=user)

    for _ in range(5):
        response = client.get("/api/v1/auth/me/")
        assert response.status_code == 200
