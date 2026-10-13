"""관리자가 요금제를 바꿨을 때 그 유저에게 보내는 인앱 알림.

apps.support의 문의 답변 알림과 같은 방식 — 항목(item)과 무관한 알림이라
item/for_date는 비워둔다.
"""

from apps.billing.models import Subscription
from apps.notifications.models import Notification


def notify_plan_granted(subscription: Subscription) -> None:
    """관리자가 플랜을 부여했거나 무료로 내린 직후."""
    plan_label = subscription.get_plan_display()
    if subscription.plan == Subscription.Plan.FREE:
        title = "무료 플랜으로 변경됐어요"
        message = "관리자가 요금제를 변경했습니다."
    elif subscription.current_period_end:
        title = f"{plan_label} 플랜이 적용됐어요"
        message = f"{subscription.current_period_end}까지 이용할 수 있습니다."
    else:
        title = f"{plan_label} 플랜이 적용됐어요"
        message = "기간 제한 없이 이용할 수 있습니다."

    Notification.objects.create(
        user=subscription.user,
        type=Notification.Type.PLAN_CHANGE,
        title=title,
        message=message,
    )


def notify_granted_plan_expired(subscription: Subscription, *, expired_plan_label: str) -> None:
    """관리자가 정한 종료일이 지나 스케줄러가 무료로 되돌린 직후."""
    Notification.objects.create(
        user=subscription.user,
        type=Notification.Type.PLAN_CHANGE,
        title=f"{expired_plan_label} 플랜 이용 기간이 끝났어요",
        message="무료 플랜으로 전환되었습니다.",
    )
