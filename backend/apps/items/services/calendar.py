"""Monthly calendar view over a user's expiry items, for the 일정 screen."""

from datetime import date
from itertools import groupby

from apps.items.models import ExpiryItem
from apps.items.services.dates import add_months


def get_monthly_calendar(user, *, year: int, month: int) -> dict:
    month_start = date(year, month, 1)
    month_end = add_months(month_start, 1)

    items = list(
        ExpiryItem.objects.filter(
            user=user, expiry_date__gte=month_start, expiry_date__lt=month_end
        ).order_by("expiry_date")
    )

    days = [
        {"date": day, "items": list(day_items)}
        for day, day_items in groupby(items, key=lambda item: item.expiry_date)
    ]

    return {"year": year, "month": month, "days": days}
