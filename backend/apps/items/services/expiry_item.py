"""Business logic for listing/filtering expiry items.

Create/update/delete for this resource are plain per-row operations with no
extra rules, so those stay in the view (via the serializer). Filtering
combines several optional query params against a computed (non-DB) status,
which is the one piece of logic worth pulling out of the view.
"""

from datetime import timedelta

from django.db.models import QuerySet
from django.utils import timezone
from django.utils.dateparse import parse_date

from apps.items.models import UPCOMING_WITHIN_DAYS, URGENT_WITHIN_DAYS, ExpiryItem


def filter_items(
    queryset: QuerySet[ExpiryItem],
    *,
    category: str | None = None,
    status: str | None = None,
    search: str | None = None,
    date: str | None = None,
) -> QuerySet[ExpiryItem]:
    if category:
        queryset = queryset.filter(category=category)

    if search:
        queryset = queryset.filter(title__icontains=search)

    if date:
        # Same "ignore, don't error" treatment as an unrecognized category/
        # status below — a malformed date just means no date filter is
        # applied, not a 500 from the DB layer.
        parsed_date = parse_date(date)
        if parsed_date:
            queryset = queryset.filter(expiry_date=parsed_date)

    if status:
        today = timezone.localdate()
        urgent_by = today + timedelta(days=URGENT_WITHIN_DAYS)
        upcoming_by = today + timedelta(days=UPCOMING_WITHIN_DAYS)

        if status == ExpiryItem.Status.EXPIRED:
            queryset = queryset.filter(expiry_date__lt=today)
        elif status == ExpiryItem.Status.URGENT:
            queryset = queryset.filter(expiry_date__gte=today, expiry_date__lte=urgent_by)
        elif status == ExpiryItem.Status.UPCOMING:
            queryset = queryset.filter(expiry_date__gt=urgent_by, expiry_date__lte=upcoming_by)
        elif status == ExpiryItem.Status.NORMAL:
            queryset = queryset.filter(expiry_date__gt=upcoming_by)

    return queryset
