from datetime import date, timedelta

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.items.models import ExpiryItem
from apps.items.services.stats import get_item_stats

TODAY = date(2026, 8, 21)


def _make_item(user, *, title="test", days_from_today=0, today=TODAY, **kwargs):
    return ExpiryItem.objects.create(
        user=user,
        title=title,
        expiry_date=today + timedelta(days=days_from_today),
        **kwargs,
    )


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com", password="a-strong-pass-1", name="테스트"
    )


class TestGetItemStats:
    @pytest.mark.django_db
    def test_counts_by_category_and_status(self, user):
        # ExpiryItem.status는 today 파라미터가 아니라 실제 오늘 날짜
        # (timezone.localdate())를 기준으로 계산되는 속성이라(모델의 "지금
        # 실제 상태"를 나타내야 하므로), 이 테스트만은 고정된 TODAY 상수가
        # 아니라 진짜 오늘 날짜를 기준으로 항목을 만들어야 세월이 지나도
        # 계속 맞는 값으로 남는다. 다른 테스트들(월별 합계)은 today 파라미터로
        # 직접 계산되는 값이라 고정된 TODAY를 그대로 써도 무방하다.
        real_today = date.today()
        _make_item(
            user,
            title="expired sub",
            category=ExpiryItem.Category.SUBSCRIPTION,
            days_from_today=-1,
            amount=10000,
            today=real_today,
        )
        _make_item(
            user,
            title="urgent contract",
            category=ExpiryItem.Category.CONTRACT,
            days_from_today=3,
            amount=20000,
            today=real_today,
        )
        _make_item(
            user,
            title="normal warranty",
            category=ExpiryItem.Category.WARRANTY,
            days_from_today=200,
            today=real_today,
        )

        stats = get_item_stats(user, today=real_today)

        assert stats["total_count"] == 3
        assert stats["expiring_soon_count"] == 1  # only the urgent one

        by_category = {row["category"]: row["count"] for row in stats["by_category"]}
        assert by_category[ExpiryItem.Category.SUBSCRIPTION] == 1
        assert by_category[ExpiryItem.Category.CONTRACT] == 1
        assert by_category[ExpiryItem.Category.WARRANTY] == 1
        assert by_category[ExpiryItem.Category.OTHER] == 0

        by_status = {row["status"]: row["count"] for row in stats["by_status"]}
        assert by_status[ExpiryItem.Status.EXPIRED] == 1
        assert by_status[ExpiryItem.Status.URGENT] == 1
        assert by_status[ExpiryItem.Status.UPCOMING] == 0
        assert by_status[ExpiryItem.Status.NORMAL] == 1

    @pytest.mark.django_db
    def test_monthly_amounts_covers_six_months_from_this_month(self, user):
        _make_item(user, title="this month", days_from_today=1, amount=5000)
        _make_item(user, title="next month", days_from_today=35, amount=7000)
        _make_item(user, title="far future", days_from_today=400, amount=99999)  # 범위 밖
        # 지난달 — 6개월 범위 밖
        _make_item(user, title="past", days_from_today=-30, amount=12345)

        stats = get_item_stats(user, today=TODAY)
        months = stats["monthly_amounts"]

        assert len(months) == 6
        assert months[0]["month"] == "2026-08"
        assert months[0]["total_amount"] == 5000
        assert months[1]["month"] == "2026-09"
        assert months[1]["total_amount"] == 7000
        assert sum(m["total_amount"] for m in months[2:]) == 0

    @pytest.mark.django_db
    def test_items_without_amount_do_not_break_monthly_sum(self, user):
        _make_item(user, title="no amount", days_from_today=1, amount=None)

        stats = get_item_stats(user, today=TODAY)

        assert stats["monthly_amounts"][0]["total_amount"] == 0

    @pytest.mark.django_db
    def test_only_counts_current_users_items(self, user):
        other = User.objects.create_user(
            email="other@example.com", password="a-strong-pass-1", name="다른유저"
        )
        _make_item(other, title="not mine")

        stats = get_item_stats(user, today=TODAY)

        assert stats["total_count"] == 0


class TestExpiryItemStatsAPI:
    @pytest.mark.django_db
    def test_returns_stats_for_authenticated_user(self, user):
        _make_item(user, title="mine", amount=1000)
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/api/v1/items/stats/")

        assert response.status_code == 200
        assert response.data["total_count"] == 1

    @pytest.mark.django_db
    def test_requires_authentication(self):
        response = APIClient().get("/api/v1/items/stats/")
        assert response.status_code == 401
