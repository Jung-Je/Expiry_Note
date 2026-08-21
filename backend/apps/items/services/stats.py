"""Aggregate stats over a user's expiry items, for the 통계 screen.

`status` is a computed (non-DB) property, so category/monthly totals are
done with querysets but the status breakdown is tallied in Python. That's
fine at MVP per-user item counts; if this ever needs to scale, `status`
would need to become a DB-backed field (or annotated with date math) first.
"""

from collections import Counter
from datetime import date

from django.db.models import QuerySet, Sum

from apps.items.models import ExpiryItem
from apps.items.services.dates import add_months

MONTHLY_AMOUNT_MONTHS_AHEAD = 6


def _monthly_amounts(queryset: QuerySet[ExpiryItem], *, today: date) -> list[dict]:
    """Sum of `amount` per calendar month of `expiry_date`, starting this month."""
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
