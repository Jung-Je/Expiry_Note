import pytest
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
