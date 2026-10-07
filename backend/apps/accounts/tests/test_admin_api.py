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
