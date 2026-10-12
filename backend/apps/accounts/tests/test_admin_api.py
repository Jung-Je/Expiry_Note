from unittest.mock import patch

import pytest
from django.conf import settings
from rest_framework.test import APIClient

from apps.accounts.models import User


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="staff@example.com", password="a-strong-pass-1", name="관리자", is_staff=True
    )


@pytest.fixture
def normal_user(db):
    return User.objects.create_user(
        email="user@example.com", password="a-strong-pass-1", name="일반유저"
    )


@pytest.fixture
def staff_client(staff_user):
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def normal_client(normal_user):
    client = APIClient()
    client.force_authenticate(user=normal_user)
    return client


class TestAdminUserListAPI:
    @pytest.mark.django_db
    def test_staff_can_list_users(self, staff_client, staff_user, normal_user):
        response = staff_client.get("/api/v1/auth/admin/users/")

        assert response.status_code == 200
        emails = [u["email"] for u in response.data]
        assert staff_user.email in emails
        assert normal_user.email in emails

        by_email = {u["email"]: u for u in response.data}
        assert by_email[staff_user.email]["is_staff"] is True
        assert by_email[normal_user.email]["is_staff"] is False

    @pytest.mark.django_db
    def test_non_staff_is_forbidden(self, normal_client):
        response = normal_client.get("/api/v1/auth/admin/users/")

        assert response.status_code == 403

    @pytest.mark.django_db
    def test_requires_authentication(self):
        response = APIClient().get("/api/v1/auth/admin/users/")

        assert response.status_code == 401

    @pytest.mark.django_db
    def test_search_filters_by_email_or_name(self, staff_client, normal_user):
        User.objects.create_user(
            email="other@example.com", password="a-strong-pass-1", name="다른사람"
        )

        response = staff_client.get("/api/v1/auth/admin/users/", {"search": normal_user.name})

        emails = [u["email"] for u in response.data]
        assert emails == [normal_user.email]


class TestAdminUserDetailAPI:
    @pytest.mark.django_db
    def test_staff_can_deactivate_a_normal_user(self, staff_client, normal_user):
        response = staff_client.patch(
            f"/api/v1/auth/admin/users/{normal_user.id}/", {"is_active": False}
        )

        assert response.status_code == 200
        normal_user.refresh_from_db()
        assert normal_user.is_active is False

    @pytest.mark.django_db
    def test_cannot_deactivate_a_staff_account(self, staff_client):
        other_staff = User.objects.create_user(
            email="other-staff@example.com",
            password="a-strong-pass-1",
            name="다른관리자",
            is_staff=True,
        )

        response = staff_client.patch(
            f"/api/v1/auth/admin/users/{other_staff.id}/", {"is_active": False}
        )

        assert response.status_code == 400
        other_staff.refresh_from_db()
        assert other_staff.is_active is True

    @pytest.mark.django_db
    def test_cannot_deactivate_self(self, staff_client, staff_user):
        response = staff_client.patch(
            f"/api/v1/auth/admin/users/{staff_user.id}/", {"is_active": False}
        )

        assert response.status_code == 400
        staff_user.refresh_from_db()
        assert staff_user.is_active is True

    @pytest.mark.django_db
    def test_non_staff_is_forbidden(self, normal_client, normal_user):
        response = normal_client.patch(
            f"/api/v1/auth/admin/users/{normal_user.id}/", {"is_active": False}
        )

        assert response.status_code == 403

    @pytest.mark.django_db
    def test_deactivated_user_cannot_log_in(self, staff_client, normal_user):
        staff_client.patch(f"/api/v1/auth/admin/users/{normal_user.id}/", {"is_active": False})

        response = APIClient().post(
            "/api/v1/auth/login/",
            {"email": normal_user.email, "password": "a-strong-pass-1"},
        )

        assert response.status_code == 401

    @pytest.mark.django_db
    def test_deactivated_user_cannot_log_in_with_kakao(self, staff_client, normal_user):
        # 카카오 로그인은 simplejwt의 is_active 검사를 거치지 않고 뷰에서 직접
        # 토큰을 만든다 — 비활성 계정에 토큰/쿠키가 발급되면 안 된다.
        normal_user.kakao_id = "777"
        normal_user.save(update_fields=["kakao_id"])
        staff_client.patch(f"/api/v1/auth/admin/users/{normal_user.id}/", {"is_active": False})

        response = _kakao_login({"id": 777, "kakao_account": {"email": normal_user.email}})

        assert response.status_code == 403
        assert "access" not in response.data
        assert settings.JWT_REFRESH_COOKIE_NAME not in response.cookies

    @pytest.mark.django_db
    def test_deactivated_email_user_is_not_linked_via_kakao(self, staff_client, normal_user):
        # 카카오 계정 이메일이 비활성화된 이메일 가입 계정과 같을 때 — 계정
        # 연결(kakao_id 저장)도, 로그인도 되면 안 된다.
        staff_client.patch(f"/api/v1/auth/admin/users/{normal_user.id}/", {"is_active": False})

        response = _kakao_login({"id": 888, "kakao_account": {"email": normal_user.email}})

        assert response.status_code == 403
        normal_user.refresh_from_db()
        assert normal_user.kakao_id is None


def _kakao_login(profile: dict):
    with (
        patch("apps.accounts.services.kakao.requests.post") as mock_post,
        patch("apps.accounts.services.kakao.requests.get") as mock_get,
    ):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"access_token": "fake-kakao-access-token"}
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = profile

        return APIClient().post(
            "/api/v1/auth/kakao/login/",
            {"code": "fake-code", "redirect_uri": "http://localhost:5173/auth/kakao/callback"},
        )
