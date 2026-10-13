from unittest.mock import patch

import pytest
from django.conf import settings
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.billing.models import Subscription
from apps.core.models import AdminActionLog


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
        assert response.data["count"] == 2
        emails = [u["email"] for u in response.data["results"]]
        assert staff_user.email in emails
        assert normal_user.email in emails

        by_email = {u["email"]: u for u in response.data["results"]}
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

        emails = [u["email"] for u in response.data["results"]]
        assert emails == [normal_user.email]

    @pytest.mark.django_db
    def test_filters_by_plan_counting_users_without_a_subscription_as_free(
        self, staff_client, staff_user, normal_user
    ):
        # staff_user는 구독 행이 아예 없고(무료), normal_user만 프로다.
        Subscription.objects.create(user=normal_user, plan=Subscription.Plan.PRO)

        pro = staff_client.get("/api/v1/auth/admin/users/", {"plan": "pro"})
        free = staff_client.get("/api/v1/auth/admin/users/", {"plan": "free"})

        assert [u["email"] for u in pro.data["results"]] == [normal_user.email]
        assert [u["email"] for u in free.data["results"]] == [staff_user.email]

    @pytest.mark.django_db
    def test_filters_by_signup_source(self, staff_client, normal_user):
        kakao_user = User.objects.create_user(
            email="kakao@example.com",
            name="카카오유저",
            signup_source=User.SignupSource.KAKAO,
        )

        response = staff_client.get("/api/v1/auth/admin/users/", {"signup_source": "kakao"})

        assert [u["email"] for u in response.data["results"]] == [kakao_user.email]

    @pytest.mark.django_db
    def test_filters_by_active_state(self, staff_client, normal_user):
        normal_user.is_active = False
        normal_user.save()

        inactive = staff_client.get("/api/v1/auth/admin/users/", {"is_active": "false"})
        active = staff_client.get("/api/v1/auth/admin/users/", {"is_active": "true"})

        assert [u["email"] for u in inactive.data["results"]] == [normal_user.email]
        assert normal_user.email not in [u["email"] for u in active.data["results"]]

    @pytest.mark.django_db
    def test_unknown_filter_values_are_ignored(self, staff_client, normal_user):
        response = staff_client.get(
            "/api/v1/auth/admin/users/", {"plan": "gold", "signup_source": "x", "is_active": "?"}
        )

        assert response.data["count"] == 2

    @pytest.mark.django_db
    def test_list_is_paginated(self, staff_client):
        for index in range(25):
            User.objects.create_user(email=f"user{index}@example.com", name=f"유저{index}")

        first = staff_client.get("/api/v1/auth/admin/users/")
        second = staff_client.get("/api/v1/auth/admin/users/", {"page": 2})

        # 스태프 본인 1명 + 25명.
        assert first.data["count"] == 26
        assert len(first.data["results"]) == 20
        assert len(second.data["results"]) == 6

    @pytest.mark.django_db
    @pytest.mark.parametrize("page", ["99", "0", "-1", "abc"])
    def test_out_of_range_page_falls_back_to_the_nearest_page(self, staff_client, page):
        response = staff_client.get("/api/v1/auth/admin/users/", {"page": page})

        assert response.status_code == 200
        assert len(response.data["results"]) == 1


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
    def test_deactivating_and_reactivating_are_logged(self, staff_client, staff_user, normal_user):
        url = f"/api/v1/auth/admin/users/{normal_user.id}/"
        staff_client.patch(url, {"is_active": False})
        staff_client.patch(url, {"is_active": True})
        # 이미 활성인 계정을 다시 활성으로 저장한 건 한 일이 없으므로 남지 않는다.
        staff_client.patch(url, {"is_active": True})

        logs = list(AdminActionLog.objects.order_by("id"))
        assert [log.action for log in logs] == [
            AdminActionLog.Action.USER_DEACTIVATE,
            AdminActionLog.Action.USER_REACTIVATE,
        ]
        assert all(log.actor == staff_user and log.target_user == normal_user for log in logs)

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
