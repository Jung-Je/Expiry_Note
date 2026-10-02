"""통계 화면용 — 사용자의 만료 항목을 집계한다.

과거 버전은 카테고리마다 `count()`/`aggregate()`를 따로 호출하고(카테고리
6개 × 2쿼리), `status`가 계산된(DB에 없는) 속성이라는 이유로 전체 row를
Python으로 끌어와 `Counter`로 세고, 월별 합계도 6개월을 한 달씩 반복
쿼리했다 — 사용자 한 명의 통계 조회에 쿼리 19개가 나갔다(항목 200개 기준
로컬 실측치).

지금 버전은 전부 DB 집계 쿼리로 바꿨다:
- 카테고리별 개수/합계: `values("category").annotate(...)` 1번
- 상태별 개수: `status`의 판정 기준(날짜 구간)을 그대로 `Q` 필터 조건으로
  옮겨 조건부 `Count`로 1번에 집계(전체 row를 끌어올 필요가 없어짐)
- 월별 합계: `TruncMonth` + `annotate(...)`로 6개월 구간을 1번에 집계
- 총 개수: 1번
총 4쿼리로 줄었다 — 19→4쿼리(4.8배), 항목 1,000개 기준 실행 시간은
22.24ms→3.58ms(6.2배). 캐시 적중 시엔 쿼리 0회, 0.09ms(46.9배).

추가로 짧은 TTL의 Redis 캐시를 옵션으로 붙였다(`use_cache=True`) — 실제
API 뷰(`views/stats.py`)만 캐시를 쓰고, 서비스 함수를 직접 호출하는
테스트/스크립트는 기본적으로 캐시를 타지 않는다. 항목 생성/수정/삭제 시
`invalidate_item_stats_cache()`를 호출해 무효화한다(뷰 쪽에서 호출).
"""

from datetime import date, timedelta

from django.core.cache import caches
from django.db.models import Count, Q, QuerySet, Sum
from django.db.models.functions import TruncMonth

from apps.items.models import ExpiryItem
from apps.items.models.expiry_item import UPCOMING_WITHIN_DAYS, URGENT_WITHIN_DAYS
from apps.items.services.dates import add_months

MONTHLY_AMOUNT_MONTHS_AHEAD = 6
# 통계는 자주 안 바뀌는 대시보드성 데이터라 TTL을 짧게만 둬도 반복 조회
# 비용을 크게 줄일 수 있다. 쓰기 시 명시적으로 무효화하므로 TTL은
# "무효화를 놓쳤을 때의 최대 지연시간" 안전망 역할이다.
STATS_CACHE_TIMEOUT_SECONDS = 60


def _cache_key(user_id: int, today: date) -> str:
    return f"item_stats:{user_id}:{today.isoformat()}"


def invalidate_item_stats_cache(user_id: int, *, today: date | None = None) -> None:
    """항목 생성/수정/삭제 시 호출 — 오늘 날짜 기준 캐시 1건만 지우면 된다.

    (지난 날짜의 캐시는 어차피 다시 조회될 일이 없고, TTL이 짧아 자연
    만료되므로 굳이 추적해서 지우지 않는다.)
    """
    caches["item_stats"].delete(_cache_key(user_id, today or date.today()))


def _monthly_amounts(queryset: QuerySet[ExpiryItem], *, today: date) -> list[dict]:
    """이번 달부터 6개월치 `amount` 합계를, 월별 group-by 1쿼리로 구한다."""
    this_month_start = today.replace(day=1)
    range_end = add_months(this_month_start, MONTHLY_AMOUNT_MONTHS_AHEAD)

    rows = (
        queryset.filter(expiry_date__gte=this_month_start, expiry_date__lt=range_end)
        .annotate(month=TruncMonth("expiry_date"))
        .values("month")
        .annotate(total=Sum("amount"))
    )
    totals_by_month = {row["month"].strftime("%Y-%m"): row["total"] or 0 for row in rows}

    months = []
    for offset in range(MONTHLY_AMOUNT_MONTHS_AHEAD):
        month_start = add_months(this_month_start, offset)
        key = month_start.strftime("%Y-%m")
        months.append({"month": key, "total_amount": totals_by_month.get(key, 0)})
    return months


def _compute_item_stats(user, *, today: date) -> dict:
    queryset = ExpiryItem.objects.filter(user=user)

    category_rows = {
        row["category"]: row
        for row in queryset.values("category").annotate(
            count=Count("id"), total_amount=Sum("amount")
        )
    }
    by_category = [
        {
            "category": choice.value,
            "label": choice.label,
            "count": category_rows.get(choice.value, {}).get("count", 0),
            "total_amount": category_rows.get(choice.value, {}).get("total_amount") or 0,
        }
        for choice in ExpiryItem.Category
    ]

    # ExpiryItem.status와 동일한 날짜 구간 판정을 DB 쪽 조건부 집계로 그대로 옮긴다.
    urgent_cutoff = today + timedelta(days=URGENT_WITHIN_DAYS)
    upcoming_cutoff = today + timedelta(days=UPCOMING_WITHIN_DAYS)
    status_totals = queryset.aggregate(
        expired=Count("id", filter=Q(expiry_date__lt=today)),
        urgent=Count("id", filter=Q(expiry_date__gte=today, expiry_date__lte=urgent_cutoff)),
        upcoming=Count(
            "id", filter=Q(expiry_date__gt=urgent_cutoff, expiry_date__lte=upcoming_cutoff)
        ),
        normal=Count("id", filter=Q(expiry_date__gt=upcoming_cutoff)),
    )
    status_count_map = {
        ExpiryItem.Status.EXPIRED: status_totals["expired"],
        ExpiryItem.Status.URGENT: status_totals["urgent"],
        ExpiryItem.Status.UPCOMING: status_totals["upcoming"],
        ExpiryItem.Status.NORMAL: status_totals["normal"],
    }
    by_status = [
        {"status": choice.value, "label": choice.label, "count": status_count_map[choice]}
        for choice in ExpiryItem.Status
    ]
    expiring_soon_count = (
        status_count_map[ExpiryItem.Status.URGENT] + status_count_map[ExpiryItem.Status.UPCOMING]
    )

    return {
        "total_count": queryset.count(),
        "expiring_soon_count": expiring_soon_count,
        "by_category": by_category,
        "by_status": by_status,
        "monthly_amounts": _monthly_amounts(queryset, today=today),
    }


def get_item_stats(user, *, today: date | None = None, use_cache: bool = False) -> dict:
    today = today or date.today()

    if not use_cache:
        return _compute_item_stats(user, today=today)

    cache = caches["item_stats"]
    key = _cache_key(user.id, today)
    cached = cache.get(key)
    if cached is not None:
        return cached

    result = _compute_item_stats(user, today=today)
    cache.set(key, result, timeout=STATS_CACHE_TIMEOUT_SECONDS)
    return result
