from datetime import date, timedelta

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.items.models import ExpiryItem
from apps.notifications.models import Notification, NotificationPreference


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com", password="a-strong-pass-1", name="테스트"
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="other@example.com", password="a-strong-pass-1", name="다른유저"
    )


@pytest.fixture
def client(user):
    api_client = APIClient()
    api_client.force_authenticate(user=user)
    return api_client


def _make_notification(user, *, title="test", is_read=False):
    item = ExpiryItem.objects.create(
        user=user, title=title, expiry_date=date.today() + timedelta(days=7)
    )
    return Notification.objects.create(
        user=user,
        item=item,
        title=title,
        message="테스트 알림",
        for_date=item.expiry_date,
        is_read=is_read,
    )


class TestNotificationListAPI:
    @pytest.mark.django_db
    def test_lists_only_own_notifications(self, client, user, other_user):
        _make_notification(user, title="mine")
        _make_notification(other_user, title="not mine")

        response = client.get("/api/v1/notifications/")

        assert response.status_code == 200
        assert [n["title"] for n in response.data] == ["mine"]

    @pytest.mark.django_db
    def test_filters_unread_only(self, client, user):
        _make_notification(user, title="read", is_read=True)
        _make_notification(user, title="unread", is_read=False)

        response = client.get("/api/v1/notifications/", {"unread": "true"})

        assert [n["title"] for n in response.data] == ["unread"]

    @pytest.mark.django_db
    def test_requires_authentication(self):
        response = APIClient().get("/api/v1/notifications/")
        assert response.status_code == 401


class TestMarkReadAPI:
    @pytest.mark.django_db
    def test_marks_own_notification_read(self, client, user):
        notification = _make_notification(user)

        response = client.post(f"/api/v1/notifications/{notification.id}/read/")

        assert response.status_code == 200
        notification.refresh_from_db()
        assert notification.is_read is True

    @pytest.mark.django_db
    def test_cannot_mark_other_users_notification_read(self, client, other_user):
        notification = _make_notification(other_user)

        response = client.post(f"/api/v1/notifications/{notification.id}/read/")

        assert response.status_code == 404
        notification.refresh_from_db()
        assert notification.is_read is False

    @pytest.mark.django_db
    def test_mark_all_read_only_touches_own_unread_notifications(self, client, user, other_user):
        _make_notification(user, title="a")
        _make_notification(user, title="b")
        other_notification = _make_notification(other_user, title="not mine")

        response = client.post("/api/v1/notifications/read-all/")

        assert response.status_code == 200
        assert response.data["updated_count"] == 2
        assert not Notification.objects.filter(user=user, is_read=False).exists()
        other_notification.refresh_from_db()
        assert other_notification.is_read is False


class TestNotificationPreferenceAPI:
    @pytest.mark.django_db
    def test_get_creates_default_preference_on_first_access(self, client, user):
        assert not NotificationPreference.objects.filter(user=user).exists()

        response = client.get("/api/v1/notifications/settings/")

        assert response.status_code == 200
        assert response.data["push_enabled"] is True
        assert NotificationPreference.objects.filter(user=user).exists()

    @pytest.mark.django_db
    def test_can_update_push_enabled(self, client, user):
        response = client.patch("/api/v1/notifications/settings/", {"push_enabled": False})

        assert response.status_code == 200
        assert response.data["push_enabled"] is False
        assert NotificationPreference.objects.get(user=user).push_enabled is False

    @pytest.mark.django_db
    def test_requires_authentication(self):
        response = APIClient().get("/api/v1/notifications/settings/")
        assert response.status_code == 401
