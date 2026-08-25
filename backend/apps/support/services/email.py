"""문의 접수 알림 메일.

apps/accounts/services/email.py와 같은 방식(Django send_mail) — 실제 발신은
EMAIL_BACKEND 설정을 따른다.
"""

from django.conf import settings
from django.core.mail import send_mail

from apps.support.models import Inquiry


def send_inquiry_notification_email(inquiry: Inquiry) -> None:
    send_mail(
        subject=f"[만료노트 문의] {inquiry.get_category_display()} - {inquiry.title}",
        message=(
            f"보낸 사람: {inquiry.user.name} <{inquiry.user.email}>\n"
            f"유형: {inquiry.get_category_display()}\n\n"
            f"{inquiry.content}"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[settings.SUPPORT_NOTIFY_EMAIL],
    )
