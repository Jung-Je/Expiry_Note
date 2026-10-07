"""문의에 답변이 달렸을 때 유저에게 보여줄 인앱 알림 생성.

이메일은 보내지 않기로 했다(의도적 결정) — 유저가 알림 목록에서 눌러서
확인하면 설정 > 문의 탭으로 이동해 답변을 보게 된다.
"""

from apps.notifications.models import Notification
from apps.support.models import Inquiry


def notify_inquiry_answered(inquiry: Inquiry) -> None:
    Notification.objects.create(
        user=inquiry.user,
        inquiry=inquiry,
        type=Notification.Type.INQUIRY_REPLY,
        title="문의하신 내용에 답변이 등록됐어요",
        message=inquiry.title,
    )
