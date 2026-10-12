from datetime import date

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.items.models import ExpiryItem
from apps.items.services.calendar import get_monthly_calendar


def _make_item(user, *, title="test", expiry_date, **kwargs):
    return ExpiryItem.objects.create(user=user, title=title, expiry_date=expiry_date, **kwargs)


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com", password="a-strong-pass-1", name="테스트"
    )


class TestGetMonthlyCalendar:
    @pytest.mark.django_db
    def test_groups_items_by_date_within_month(self, user):
        _make_item(user, title="a", expiry_date=date(2026, 8, 5))
        _make_item(user, title="b", expiry_date=date(2026, 8, 5))
        _make_item(user, title="c", expiry_date=date(2026, 8, 20))

        calendar = get_monthly_calendar(user, year=2026, month=8)

        assert calendar["year"] == 2026
        assert calendar["month"] == 8
        assert len(calendar["days"]) == 2
        assert calendar["days"][0]["date"] == date(2026, 8, 5)
        assert {item.title for item in calendar["days"][0]["items"]} == {"a", "b"}
        assert calendar["days"][1]["date"] == date(2026, 8, 20)

    @pytest.mark.django_db
    def test_excludes_items_outside_the_month(self, user):
        _make_item(user, title="july", expiry_date=date(2026, 7, 31))
        _make_item(user, title="september", expiry_date=date(2026, 9, 1))

        calendar = get_monthly_calendar(user, year=2026, month=8)

        assert calendar["days"] == []

    @pytest.mark.django_db
    def test_handles_december_month_rollover(self, user):
        _make_item(user, title="dec", expiry_date=date(2026, 12, 15))
        _make_item(user, title="next-jan", expiry_date=date(2027, 1, 1))

        calendar = get_monthly_calendar(user, year=2026, month=12)

        assert [item.title for day in calendar["days"] for item in day["items"]] == ["dec"]

    @pytest.mark.django_db
    def test_only_includes_current_users_items(self, user):
        other = User.objects.create_user(
            email="other@example.com", password="a-strong-pass-1", name="다른유저"
        )
        _make_item(other, title="not mine", expiry_date=date(2026, 8, 5))

        calendar = get_monthly_calendar(user, year=2026, month=8)

        assert calendar["days"] == []


class TestExpiryItemCalendarAPI:
    @pytest.mark.django_db
    def test_defaults_to_current_month(self, user):
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/api/v1/items/calendar/")

        assert response.status_code == 200
        assert response.data["year"] and response.data["month"]

    @pytest.mark.django_db
    def test_returns_requested_month(self, user):
        _make_item(user, title="a", expiry_date=date(2026, 8, 5))
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/api/v1/items/calendar/", {"year": 2026, "month": 8})

        assert response.status_code == 200
        assert response.data["days"][0]["date"] == "2026-08-05"
        assert response.data["days"][0]["items"][0]["title"] == "a"

    @pytest.mark.django_db
    def test_rejects_invalid_month(self, user):
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/api/v1/items/calendar/", {"year": 2026, "month": 13})

        assert response.status_code == 400

    @pytest.mark.django_db
    def test_requires_authentication(self):
        response = APIClient().get("/api/v1/items/calendar/")
        assert response.status_code == 401


class TestDateFilterOnListEndpoint:
    @pytest.mark.django_db
    def test_filters_items_by_exact_date(self, user):
        _make_item(user, title="on date", expiry_date=date(2026, 8, 5))
        _make_item(user, title="other date", expiry_date=date(2026, 8, 6))
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/api/v1/items/", {"date": "2026-08-05"})

        assert response.status_code == 200
        assert [item["title"] for item in response.data] == ["on date"]

    @pytest.mark.django_db
    def test_invalid_date_is_ignored_not_an_error(self, user):
        _make_item(user, title="a", expiry_date=date(2026, 8, 5))
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/api/v1/items/", {"date": "not-a-date"})

        assert response.status_code == 200
        assert [item["title"] for item in response.data] == ["a"]

    @pytest.mark.django_db
    def test_nonexistent_date_is_ignored_not_an_error(self, user):
        # 형식은 맞지만 없는 날짜 — parse_date가 ValueError를 던지는 경우.
        _make_item(user, title="a", expiry_date=date(2026, 8, 5))
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/api/v1/items/", {"date": "2026-13-45"})

        assert response.status_code == 200
        assert [item["title"] for item in response.data] == ["a"]


class TestMonthFilterOnListEndpoint:
    @pytest.mark.django_db
    def test_filters_items_by_month(self, user):
        _make_item(user, title="first day", expiry_date=date(2026, 8, 1))
        _make_item(user, title="last day", expiry_date=date(2026, 8, 31))
        _make_item(user, title="previous month", expiry_date=date(2026, 7, 31))
        _make_item(user, title="next month", expiry_date=date(2026, 9, 1))
        _make_item(user, title="same month other year", expiry_date=date(2027, 8, 15))
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/api/v1/items/", {"month": "2026-08"})

        assert response.status_code == 200
        assert [item["title"] for item in response.data] == ["first day", "last day"]

    @pytest.mark.django_db
    @pytest.mark.parametrize("month", ["not-a-month", "2026-13", "2026"])
    def test_invalid_month_is_ignored_not_an_error(self, user, month):
        _make_item(user, title="a", expiry_date=date(2026, 8, 5))
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/api/v1/items/", {"month": month})

        assert response.status_code == 200
        assert [item["title"] for item in response.data] == ["a"]
