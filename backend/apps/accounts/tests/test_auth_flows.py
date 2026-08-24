from unittest.mock import patch

import pytest
from django.core import mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User
from apps.accounts.services import (
    InvalidKakaoCode,
    InvalidKakaoToken,
    InvalidVerificationToken,
    change_password,
    confirm_password_reset,
    exchange_kakao_code,
    get_or_create_kakao_user,
    request_password_reset,
    signup,
    verify_email,
    withdraw,
)
from apps.accounts.services.tokens import email_verification_token_generator


@pytest.mark.django_db
def test_signup_creates_unverified_user_and_sends_email():
    user = signup(email="new@example.com", password="a-strong-pass-1", name="테스트")

    assert User.objects.filter(email="new@example.com").exists()
    assert user.check_password("a-strong-pass-1")
    assert user.is_email_verified is False
    assert len(mail.outbox) == 1
    assert "인증" in mail.outbox[0].subject


@pytest.mark.django_db
def test_verify_email_marks_user_verified():
    user = signup(email="verify@example.com", password="a-strong-pass-1", name="테스트")
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token_generator.make_token(user)

    verified_user = verify_email(uid=uid, token=token)

    user.refresh_from_db()
    assert user.is_email_verified is True
    assert verified_user.pk == user.pk


@pytest.mark.django_db
def test_verify_email_rejects_bad_token():
    user = signup(email="badtoken@example.com", password="a-strong-pass-1", name="테스트")
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    with pytest.raises(InvalidVerificationToken):
        verify_email(uid=uid, token="not-a-real-token")


@pytest.mark.django_db
def test_password_reset_round_trip():
    user = User.objects.create_user(email="reset@example.com", password="old-pass-1", name="테스트")
    mail.outbox = []

    request_password_reset(email=user.email)
    assert len(mail.outbox) == 1

    body = mail.outbox[0].body
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = body.split("token=")[1].strip()

    confirm_password_reset(uid=uid, token=token, new_password="new-strong-pass-1")

    user.refresh_from_db()
    assert user.check_password("new-strong-pass-1")


@pytest.mark.django_db
def test_password_reset_request_is_silent_for_unknown_email():
    request_password_reset(email="nobody@example.com")
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_password_reset_confirm_revokes_existing_refresh_tokens():
    user = User.objects.create_user(
        email="revoke-reset@example.com", password="old-pass-1", name="테스트"
    )
    RefreshToken.for_user(user)
    RefreshToken.for_user(user)
    assert OutstandingToken.objects.filter(user=user).count() == 2
    assert BlacklistedToken.objects.filter(token__user=user).count() == 0

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    mail.outbox = []
    request_password_reset(email=user.email)
    token = mail.outbox[0].body.split("token=")[1].strip()

    confirm_password_reset(uid=uid, token=token, new_password="new-strong-pass-1")

    assert BlacklistedToken.objects.filter(token__user=user).count() == 2


@pytest.mark.django_db
def test_change_password_revokes_existing_refresh_tokens():
    user = User.objects.create_user(
        email="revoke-change@example.com", password="old-pass-1", name="테스트"
    )
    RefreshToken.for_user(user)
    assert BlacklistedToken.objects.filter(token__user=user).count() == 0

    change_password(user, current_password="old-pass-1", new_password="new-strong-pass-1")

    assert BlacklistedToken.objects.filter(token__user=user).count() == 1


@pytest.mark.django_db
def test_withdraw_revokes_existing_refresh_tokens_before_deleting_user():
    user = User.objects.create_user(
        email="revoke-withdraw@example.com", password="old-pass-1", name="테스트"
    )
    RefreshToken.for_user(user)
    outstanding_id = OutstandingToken.objects.get(user=user).id

    withdraw(user)

    assert not User.objects.filter(email="revoke-withdraw@example.com").exists()
    assert BlacklistedToken.objects.filter(token_id=outstanding_id).exists()


@pytest.mark.django_db
def test_kakao_login_creates_user_from_profile():
    fake_response = {
        "id": 123456789,
        "kakao_account": {
            "email": "kakao-user@example.com",
            "profile": {"nickname": "카카오유저"},
        },
    }
    with patch("apps.accounts.services.kakao.requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = fake_response

        user = get_or_create_kakao_user("fake-kakao-access-token")

    assert user.kakao_id == "123456789"
    assert user.email == "kakao-user@example.com"
    assert user.has_usable_password() is False

    # 같은 카카오 계정으로 다시 로그인하면 새 유저를 만들지 않고 그대로 반환한다.
    with patch("apps.accounts.services.kakao.requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = fake_response

        same_user = get_or_create_kakao_user("fake-kakao-access-token")

    assert same_user.pk == user.pk
    assert User.objects.count() == 1


@pytest.mark.django_db
def test_kakao_login_rejects_invalid_token():
    with patch("apps.accounts.services.kakao.requests.get") as mock_get:
        mock_get.return_value.status_code = 401
        mock_get.return_value.text = "invalid token"

        with pytest.raises(InvalidKakaoToken):
            get_or_create_kakao_user("bad-token")


def test_exchange_kakao_code_returns_access_token(settings):
    settings.KAKAO_REST_API_KEY = "rest-api-key"
    settings.KAKAO_CLIENT_SECRET = ""

    with patch("apps.accounts.services.kakao.requests.post") as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"access_token": "issued-access-token"}

        token = exchange_kakao_code(
            code="auth-code", redirect_uri="http://localhost:5173/auth/kakao/callback"
        )

    assert token == "issued-access-token"
    _, kwargs = mock_post.call_args
    assert kwargs["data"]["client_id"] == "rest-api-key"
    assert kwargs["data"]["redirect_uri"] == "http://localhost:5173/auth/kakao/callback"
    assert kwargs["data"]["code"] == "auth-code"
    # client_secret이 설정 안 돼있으면(카카오 앱에서 꺼둔 경우) 아예 안 보낸다.
    assert "client_secret" not in kwargs["data"]


def test_exchange_kakao_code_includes_client_secret_when_configured(settings):
    settings.KAKAO_REST_API_KEY = "rest-api-key"
    settings.KAKAO_CLIENT_SECRET = "shh-its-a-secret"

    with patch("apps.accounts.services.kakao.requests.post") as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"access_token": "issued-access-token"}

        exchange_kakao_code(code="auth-code", redirect_uri="http://localhost:5173/x")

    _, kwargs = mock_post.call_args
    assert kwargs["data"]["client_secret"] == "shh-its-a-secret"


def test_exchange_kakao_code_rejects_invalid_code():
    with patch("apps.accounts.services.kakao.requests.post") as mock_post:
        mock_post.return_value.status_code = 400
        mock_post.return_value.text = "invalid_grant"

        with pytest.raises(InvalidKakaoCode):
            exchange_kakao_code(code="bad-code", redirect_uri="http://localhost:5173/x")
