from unittest.mock import patch

import pytest
from django.core import mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.accounts.models import User
from apps.accounts.services import (
    InvalidKakaoToken,
    InvalidVerificationToken,
    confirm_password_reset,
    get_or_create_kakao_user,
    request_password_reset,
    signup,
    verify_email,
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
