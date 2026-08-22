"""통계 화면용 — 사용자의 만료 항목을 집계한다.

`status`는 계산된(DB에 없는) 속성이라, 유형별/월별 합계는 쿼리셋으로
처리하지만 status별 집계는 Python에서 센다. MVP 수준의 사용자당 항목
수에서는 문제없지만, 나중에 규모가 커지면 `status`를 DB 필드로
바꾸거나(또는 날짜 계산으로 annotate) 해야 한다.
"""

from collections import Counter
from datetime import date

from django.db.models import QuerySet, Sum

from apps.items.models import ExpiryItem
from apps.items.services.dates import add_months

MONTHLY_AMOUNT_MONTHS_AHEAD = 6


def _monthly_amounts(queryset: QuerySet[ExpiryItem], *, today: date) -> list[dict]:
    """이번 달부터 `expiry_date`의 월별로 `amount`를 합산한다."""
    this_month_start = today.replace(day=1)
    months = []
    for offset in range(MONTHLY_AMOUNT_MONTHS_AHEAD):
        month_start = add_months(this_month_start, offset)
        month_end = add_months(this_month_start, offset + 1)
        total = (
            queryset.filter(expiry_date__gte=month_start, expiry_date__lt=month_end).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )
        months.append({"month": month_start.strftime("%Y-%m"), "total_amount": total})
    return months


def get_item_stats(user, *, today: date | None = None) -> dict:
    today = today or date.today()
    queryset = ExpiryItem.objects.filter(user=user)

    by_category = [
        {
            "category": choice.value,
            "label": choice.label,
            "count": queryset.filter(category=choice.value).count(),
        }
        for choice in ExpiryItem.Category
    ]

    status_counts = Counter(item.status for item in queryset)
    by_status = [
        {
            "status": choice.value,
            "label": choice.label,
            "count": status_counts.get(choice.value, 0),
        }
        for choice in ExpiryItem.Status
    ]
    expiring_soon_count = status_counts.get(ExpiryItem.Status.URGENT, 0) + status_counts.get(
        ExpiryItem.Status.UPCOMING, 0
    )

    return {
        "total_count": queryset.count(),
        "expiring_soon_count": expiring_soon_count,
        "by_category": by_category,
        "by_status": by_status,
        "monthly_amounts": _monthly_amounts(queryset, today=today),
    }
