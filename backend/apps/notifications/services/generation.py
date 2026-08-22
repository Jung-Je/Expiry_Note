"""'항목의 만료가 다가온다'를 인앱 Notification row로 바꾼다.

하루에 한 번 실행되는 걸 전제로 한다 (`generate_notifications` 관리
명령어 참고) — 요청마다 트리거되지 않는다. 멱등적이다: Notification이
(item, for_date)에 유니크 제약이 있어서, 같은 날 다시 실행해도 중복
생성되지 않는다.
"""

from datetime import date

from django.utils import timezone

from apps.items.models import ExpiryItem
from apps.notifications.models import Notification

# 정기 결제가 있는 유형은 "결제 예정", 그 외(계약/보증 등)는 "만료 예정"으로 분류한다.
PAYMENT_CATEGORIES = {
    ExpiryItem.Category.SUBSCRIPTION,
    ExpiryItem.Category.INSURANCE,
    ExpiryItem.Category.MEMBERSHIP,
}


def _notification_type_for(category: str) -> str:
    return Notification.Type.PAYMENT if category in PAYMENT_CATEGORIES else Notification.Type.EXPIRY


def _message_for(item: ExpiryItem, *, days_until: int) -> str:
    if days_until == 0:
        return f"{item.title}이(가) 오늘 만료됩니다."
    return f"{item.title} 만료가 {days_until}일 남았습니다."


def generate_due_notifications(*, today: date | None = None) -> list[Notification]:
    today = today or timezone.localdate()
    created = []

    for item in ExpiryItem.objects.filter(expiry_date__gte=today):
        days_until = (item.expiry_date - today).days
        if days_until != item.notify_days_before:
            continue

        notification, was_created = Notification.objects.get_or_create(
            item=item,
            for_date=item.expiry_date,
            defaults={
                "user": item.user,
                "type": _notification_type_for(item.category),
                "title": item.title,
                "message": _message_for(item, days_until=days_until),
            },
        )
        if was_created:
            created.append(notification)

    return created
