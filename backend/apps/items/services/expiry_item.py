"""만료 항목 목록 조회/필터링 관련 비즈니스 로직.

이 리소스의 생성/수정/삭제는 특별한 규칙 없이 단순한 row 단위 처리라 뷰(와
serializer)에 그대로 둔다. 필터링만 여러 선택적 쿼리 파라미터를 계산된
(DB에 없는) status와 조합해야 해서, 뷰에서 뽑아낼 가치가 있는 유일한
로직이다.
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
        # 아래의 인식 못한 category/status와 같은 "무시하고 에러 내지 않기"
        # 방식 — 형식이 잘못된 날짜는 그냥 날짜 필터를 적용하지 않을 뿐,
        # DB 레이어에서 500이 나지 않는다.
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
