"""refresh token이 응답 바디가 아니라 httpOnly 쿠키로 오가는지 검증한다.

access token만 응답 바디에 남고, refresh token은 Set-Cookie로만 내려가야
한다. `rest_framework.test.APIClient`는 Django `Client`를 상속해 쿠키
jar를 유지하므로, 로그인 응답에서 심어진 쿠키가 같은 client의 다음 요청에
자동으로 실린다 — 브라우저 동작과 동일하게 테스트할 수 있다.
"""

from unittest.mock import patch

import pytest
from django.conf import settings
from rest_framework.test import APIClient

from apps.accounts.models import User


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="cookie@example.com", password="right-strong-pass-1", name="테스트"
    )


@pytest.mark.django_db
def test_login_sets_refresh_cookie_and_omits_it_from_body(user):
    client = APIClient()

    response = client.post(
        "/api/v1/auth/login/", {"email": user.email, "password": "right-strong-pass-1"}
    )

    assert response.status_code == 200
    assert "access" in response.data
    assert "refresh" not in response.data

    cookie = response.cookies[settings.JWT_REFRESH_COOKIE_NAME]
    assert cookie.value
    assert cookie["httponly"]
    assert cookie["path"] == settings.JWT_REFRESH_COOKIE_PATH
    assert cookie["samesite"] == settings.JWT_REFRESH_COOKIE_SAMESITE


@pytest.mark.django_db
def test_token_refresh_reads_cookie_and_rotates_it(user):
    client = APIClient()
    login_response = client.post(
        "/api/v1/auth/login/", {"email": user.email, "password": "right-strong-pass-1"}
    )
    old_refresh = login_response.cookies[settings.JWT_REFRESH_COOKIE_NAME].value

    refresh_response = client.post("/api/v1/auth/token/refresh/")

    assert refresh_response.status_code == 200
    assert "access" in refresh_response.data
    assert "refresh" not in refresh_response.data
    new_refresh = refresh_response.cookies[settings.JWT_REFRESH_COOKIE_NAME].value
    assert new_refresh and new_refresh != old_refresh


@pytest.mark.django_db
def test_token_refresh_without_cookie_or_body_is_rejected():
    response = APIClient().post("/api/v1/auth/token/refresh/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_token_refresh_for_deleted_user_returns_401_not_500(user):
    # 서명은 유효한 refresh token인데 그 유저가 이미 탈퇴한 경우 — 브라우저에
    # 남아있는 쿠키로 재발급을 시도하면(예: AuthProvider의 마운트 시 조용한
    # 재로그인) simplejwt가 User.DoesNotExist를 그대로 던져 500이 나던 버그.
    client = APIClient()
    login_response = client.post(
        "/api/v1/auth/login/", {"email": user.email, "password": "right-strong-pass-1"}
    )
    refresh_value = login_response.cookies[settings.JWT_REFRESH_COOKIE_NAME].value

    user.delete()

    response = APIClient().post("/api/v1/auth/token/refresh/", {"refresh": refresh_value})

    assert response.status_code == 401


@pytest.mark.django_db
def test_token_refresh_body_value_takes_priority_over_cookie(user):
    # 쿠키 없이 바디로 직접 refresh를 보내는 하위호환 경로(테스트, 서버-투-서버)도
    # 계속 동작해야 한다.
    client = APIClient()
    login_response = client.post(
        "/api/v1/auth/login/", {"email": user.email, "password": "right-strong-pass-1"}
    )
    refresh_value = login_response.cookies[settings.JWT_REFRESH_COOKIE_NAME].value

    response = APIClient().post("/api/v1/auth/token/refresh/", {"refresh": refresh_value})

    assert response.status_code == 200
    assert "access" in response.data


@pytest.mark.django_db
def test_logout_clears_the_cookie(user):
    client = APIClient()
    client.post("/api/v1/auth/login/", {"email": user.email, "password": "right-strong-pass-1"})
    client.force_authenticate(user=user)

    response = client.post("/api/v1/auth/logout/")

    assert response.status_code == 204
    cleared = response.cookies[settings.JWT_REFRESH_COOKIE_NAME]
    assert cleared.value == ""


@pytest.mark.django_db
def test_logout_blacklists_the_cookie_refresh_token(user):
    client = APIClient()
    login_response = client.post(
        "/api/v1/auth/login/", {"email": user.email, "password": "right-strong-pass-1"}
    )
    refresh_value = login_response.cookies[settings.JWT_REFRESH_COOKIE_NAME].value
    client.force_authenticate(user=user)

    logout_response = client.post("/api/v1/auth/logout/")
    assert logout_response.status_code == 204

    # 응답이 쿠키 자체는 지웠으니, 블랙리스트 확인은 로그아웃 전 값을 바디로
    # 직접 보내서 확인한다.
    retry = APIClient().post("/api/v1/auth/token/refresh/", {"refresh": refresh_value})
    assert retry.status_code == 401


@pytest.mark.django_db
def test_kakao_login_sets_refresh_cookie_and_omits_it_from_body():
    fake_profile = {
        "id": 999999,
        "kakao_account": {
            "email": "kakao-cookie@example.com",
            "profile": {"nickname": "카카오유저"},
        },
    }
    client = APIClient()
    with (
        patch("apps.accounts.services.kakao.requests.post") as mock_post,
        patch("apps.accounts.services.kakao.requests.get") as mock_get,
    ):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"access_token": "fake-kakao-access-token"}
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = fake_profile

        response = client.post(
            "/api/v1/auth/kakao/login/",
            {"code": "fake-code", "redirect_uri": "http://localhost:5173/auth/kakao/callback"},
        )

    assert response.status_code == 200
    assert "access" in response.data
    assert "refresh" not in response.data
    assert response.cookies[settings.JWT_REFRESH_COOKIE_NAME].value
