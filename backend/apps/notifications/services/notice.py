"""관리자가 여러 회원에게 한꺼번에 보내는 공지(인앱 알림).

점검 안내처럼 항목(item)과 무관한 알림이라 item/for_date는 비워둔다.
이메일은 보내지 않는다 — 문의 답변 알림과 같은 방식.
"""

from django.db.models import Q, QuerySet

from apps.accounts.models import User
from apps.notifications.models import Notification

AUDIENCE_ALL = "all"
# "all" 외에는 요금제 값(apps.billing.models.Subscription.Plan)과 같다.
AUDIENCE_LABELS = {
    AUDIENCE_ALL: "전체 회원",
    "free": "무료 플랜 회원",
    "basic": "베이직 플랜 회원",
    "pro": "프로 플랜 회원",
}

_BULK_BATCH_SIZE = 500


def _recipients(audience: str) -> QuerySet[User]:
    # 비활성화된 계정은 로그인할 수 없어 알림을 볼 일이 없다.
    users = User.objects.filter(is_active=True)
    if audience == AUDIENCE_ALL:
        return users
    if audience == "free":
        # 구독 행은 요금제 화면을 처음 열 때 생기므로, 없는 유저도 무료다.
        return users.filter(Q(subscription__isnull=True) | Q(subscription__plan="free"))
    return users.filter(subscription__plan=audience)


def send_notice(*, title: str, message: str, audience: str = AUDIENCE_ALL) -> int:
    """공지를 보내고, 받은 회원 수를 돌려준다."""
    if audience not in AUDIENCE_LABELS:
        raise ValueError(f"unknown audience: {audience}")

    user_ids = _recipients(audience).values_list("id", flat=True)
    notifications = [
        Notification(
            user_id=user_id,
            type=Notification.Type.NOTICE,
            title=title,
            message=message,
        )
        for user_id in user_ids.iterator()
    ]
    Notification.objects.bulk_create(notifications, batch_size=_BULK_BATCH_SIZE)
    return len(notifications)
