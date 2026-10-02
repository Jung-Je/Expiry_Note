from datetime import date, timedelta

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.items.models import ExpiryItem
from apps.items.services.stats import get_item_stats

TODAY = date(2026, 8, 21)

# item_stats 캐시 동작을 검증하는 테스트는 실제 Redis 유무와 무관하게
# 항상 같은 결과를 내야 하므로(CI에는 Redis 서비스가 없음), 이 모듈
# 안에서만 item_stats 캐시를 LocMemCache로 덮어쓴다. get/set/delete
# 시맨틱은 백엔드와 무관하게 동일하므로 캐싱/무효화 로직 자체를
# 검증하는 데는 이걸로 충분하다 — 실제 운영 백엔드(Redis)는
# config/settings/base.py 참고.
LOCMEM_ITEM_STATS_CACHES = override_settings(
    CACHES={
        "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
        "item_stats": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "test-item-stats-cache",
        },
    }
)


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

        by_category_amount = {row["category"]: row["total_amount"] for row in stats["by_category"]}
        assert by_category_amount[ExpiryItem.Category.SUBSCRIPTION] == 10000
        assert by_category_amount[ExpiryItem.Category.CONTRACT] == 20000
        assert by_category_amount[ExpiryItem.Category.WARRANTY] == 0  # amount 없이 생성됨
        assert by_category_amount[ExpiryItem.Category.OTHER] == 0

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

    @LOCMEM_ITEM_STATS_CACHES
    @pytest.mark.django_db
    def test_response_is_cached_between_requests(self, user, django_assert_num_queries):
        _make_item(user, title="mine", amount=1000)
        client = APIClient()
        client.force_authenticate(user=user)

        first = client.get("/api/v1/items/stats/")
        assert first.data["total_count"] == 1

        # 캐시가 실제로 쓰였다면, 캐시 적중 시 DB 쿼리가 전혀 나가지 않아야 한다.
        with django_assert_num_queries(0):
            second = client.get("/api/v1/items/stats/")
        assert second.data == first.data

    @LOCMEM_ITEM_STATS_CACHES
    @pytest.mark.django_db
    def test_cache_invalidated_on_create_update_delete(self, user):
        client = APIClient()
        client.force_authenticate(user=user)

        assert client.get("/api/v1/items/stats/").data["total_count"] == 0

        create_res = client.post(
            "/api/v1/items/",
            {"title": "새 항목", "expiry_date": str(date.today() + timedelta(days=10))},
        )
        assert create_res.status_code == 201
        # 생성 직후 캐시가 무효화되지 않았다면 여기서 여전히 0이 나와야 한다(= 버그).
        assert client.get("/api/v1/items/stats/").data["total_count"] == 1

        item_id = create_res.data["id"]
        update_res = client.patch(f"/api/v1/items/{item_id}/", {"amount": 5000})
        assert update_res.status_code == 200
        stats_after_update = client.get("/api/v1/items/stats/").data
        total_amount = sum(row["total_amount"] for row in stats_after_update["by_category"])
        assert total_amount == 5000

        delete_res = client.delete(f"/api/v1/items/{item_id}/")
        assert delete_res.status_code == 204
        assert client.get("/api/v1/items/stats/").data["total_count"] == 0
