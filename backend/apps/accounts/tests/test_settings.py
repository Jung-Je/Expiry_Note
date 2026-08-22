import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User
from apps.accounts.services import InvalidCurrentPassword, change_password, withdraw


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com", password="old-strong-pass-1", name="원래이름"
    )


@pytest.fixture
def client(user):
    api_client = APIClient()
    api_client.force_authenticate(user=user)
    return api_client


class TestChangePasswordService:
    @pytest.mark.django_db
    def test_changes_password_when_current_password_is_correct(self, user):
        change_password(
            user, current_password="old-strong-pass-1", new_password="new-strong-pass-1"
        )

        user.refresh_from_db()
        assert user.check_password("new-strong-pass-1")

    @pytest.mark.django_db
    def test_rejects_wrong_current_password(self, user):
        with pytest.raises(InvalidCurrentPassword):
            change_password(
                user, current_password="wrong-password", new_password="new-strong-pass-1"
            )

        user.refresh_from_db()
        assert user.check_password("old-strong-pass-1")


class TestWithdrawService:
    @pytest.mark.django_db
    def test_deletes_the_user(self, user):
        user_id = user.id

        withdraw(user)

        assert not User.objects.filter(id=user_id).exists()


class TestMeAPI:
    @pytest.mark.django_db
    def test_updates_name(self, client, user):
        response = client.patch("/api/v1/auth/me/", {"name": "새이름"})

        assert response.status_code == 200
        assert response.data["name"] == "새이름"
        user.refresh_from_db()
        assert user.name == "새이름"

    @pytest.mark.django_db
    def test_email_is_not_editable_via_profile_update(self, client, user):
        response = client.patch("/api/v1/auth/me/", {"email": "new@example.com"})

        assert response.status_code == 200
        user.refresh_from_db()
        assert user.email == "owner@example.com"

    @pytest.mark.django_db
    def test_delete_withdraws_account(self, client, user):
        response = client.delete("/api/v1/auth/me/")

        assert response.status_code == 204
        assert not User.objects.filter(id=user.id).exists()

    @pytest.mark.django_db
    def test_requires_authentication(self):
        response = APIClient().get("/api/v1/auth/me/")
        assert response.status_code == 401


class TestChangePasswordAPI:
    @pytest.mark.django_db
    def test_changes_password(self, client, user):
        response = client.post(
            "/api/v1/auth/password/change/",
            {"current_password": "old-strong-pass-1", "new_password": "new-strong-pass-1"},
        )

        assert response.status_code == 200
        user.refresh_from_db()
        assert user.check_password("new-strong-pass-1")

    @pytest.mark.django_db
    def test_rejects_wrong_current_password(self, client, user):
        response = client.post(
            "/api/v1/auth/password/change/",
            {"current_password": "wrong", "new_password": "new-strong-pass-1"},
        )

        assert response.status_code == 400
        user.refresh_from_db()
        assert user.check_password("old-strong-pass-1")

    @pytest.mark.django_db
    def test_rejects_weak_new_password(self, client):
        response = client.post(
            "/api/v1/auth/password/change/",
            {"current_password": "old-strong-pass-1", "new_password": "123"},
        )

        assert response.status_code == 400


class TestLogoutAPI:
    @pytest.mark.django_db
    def test_blacklists_refresh_token(self, client, user):
        refresh = RefreshToken.for_user(user)

        response = client.post("/api/v1/auth/logout/", {"refresh": str(refresh)})

        assert response.status_code == 204
        refresh_response = APIClient().post(
            "/api/v1/auth/token/refresh/", {"refresh": str(refresh)}
        )
        assert refresh_response.status_code == 401

    @pytest.mark.django_db
    def test_rejects_invalid_token(self, client):
        response = client.post("/api/v1/auth/logout/", {"refresh": "not-a-real-token"})

        assert response.status_code == 400

    @pytest.mark.django_db
    def test_requires_authentication(self):
        response = APIClient().post("/api/v1/auth/logout/", {"refresh": "whatever"})
        assert response.status_code == 401
