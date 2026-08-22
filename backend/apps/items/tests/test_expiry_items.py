from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.items.models import ExpiryItem
from apps.items.services import filter_items


def _make_item(user, *, title="test", days_from_today=0, **kwargs):
    return ExpiryItem.objects.create(
        user=user,
        title=title,
        expiry_date=timezone.localdate() + timedelta(days=days_from_today),
        **kwargs,
    )


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


class TestExpiryItemStatus:
    @pytest.mark.django_db
    def test_status_thresholds(self, user):
        assert _make_item(user, days_from_today=-1).status == ExpiryItem.Status.EXPIRED
        assert _make_item(user, days_from_today=0).status == ExpiryItem.Status.URGENT
        assert _make_item(user, days_from_today=7).status == ExpiryItem.Status.URGENT
        assert _make_item(user, days_from_today=8).status == ExpiryItem.Status.UPCOMING
        assert _make_item(user, days_from_today=30).status == ExpiryItem.Status.UPCOMING
        assert _make_item(user, days_from_today=31).status == ExpiryItem.Status.NORMAL


class TestFilterItems:
    @pytest.mark.django_db
    def test_filters_by_category(self, user):
        _make_item(user, title="넷플릭스", category=ExpiryItem.Category.SUBSCRIPTION)
        _make_item(user, title="자동차 보험", category=ExpiryItem.Category.INSURANCE)

        result = filter_items(ExpiryItem.objects.all(), category=ExpiryItem.Category.INSURANCE)

        assert [item.title for item in result] == ["자동차 보험"]

    @pytest.mark.django_db
    def test_filters_by_search(self, user):
        _make_item(user, title="넷플릭스 구독")
        _make_item(user, title="헬스장 멤버십")

        result = filter_items(ExpiryItem.objects.all(), search="넷플릭스")

        assert [item.title for item in result] == ["넷플릭스 구독"]

    @pytest.mark.django_db
    def test_filters_by_status(self, user):
        expired = _make_item(user, title="expired", days_from_today=-1)
        urgent = _make_item(user, title="urgent", days_from_today=3)
        upcoming = _make_item(user, title="upcoming", days_from_today=20)
        normal = _make_item(user, title="normal", days_from_today=100)

        assert list(filter_items(ExpiryItem.objects.all(), status="expired")) == [expired]
        assert list(filter_items(ExpiryItem.objects.all(), status="urgent")) == [urgent]
        assert list(filter_items(ExpiryItem.objects.all(), status="upcoming")) == [upcoming]
        assert list(filter_items(ExpiryItem.objects.all(), status="normal")) == [normal]


class TestExpiryItemAPI:
    @pytest.mark.django_db
    def test_create_item_assigns_current_user(self, client, user):
        response = client.post(
            "/api/v1/items/",
            {
                "title": "넷플릭스",
                "category": "subscription",
                "expiry_date": "2026-09-01",
                "amount": 17000,
            },
        )

        assert response.status_code == 201
        item = ExpiryItem.objects.get()
        assert item.user == user
        assert item.title == "넷플릭스"

    @pytest.mark.django_db
    def test_list_only_returns_own_items(self, client, user, other_user):
        _make_item(user, title="mine")
        _make_item(other_user, title="not mine")

        response = client.get("/api/v1/items/")

        assert response.status_code == 200
        assert [item["title"] for item in response.data] == ["mine"]

    @pytest.mark.django_db
    def test_cannot_retrieve_other_users_item(self, client, other_user):
        item = _make_item(other_user, title="not mine")

        response = client.get(f"/api/v1/items/{item.id}/")

        assert response.status_code == 404

    @pytest.mark.django_db
    def test_update_and_delete_own_item(self, client, user):
        item = _make_item(user, title="original")

        update_response = client.patch(f"/api/v1/items/{item.id}/", {"title": "renamed"})
        assert update_response.status_code == 200
        assert update_response.data["title"] == "renamed"

        delete_response = client.delete(f"/api/v1/items/{item.id}/")
        assert delete_response.status_code == 204
        assert not ExpiryItem.objects.filter(id=item.id).exists()

    @pytest.mark.django_db
    def test_requires_authentication(self):
        response = APIClient().get("/api/v1/items/")
        assert response.status_code == 401
