"""문의 생성 오케스트레이션.

문의는 반드시 DB에 남아야 하지만, 알림 메일은 부가 기능이다 — SMTP가
일시적으로 실패해도 사용자의 문의 제출 자체는 성공해야 하므로, 메일 발송
실패는 삼키고 로깅만 한다(문의는 이미 저장됐으니 관리자가 admin에서
확인할 수 있다).
"""

import logging

from apps.accounts.models import User
from apps.support.models import Inquiry
from apps.support.services.email import send_inquiry_notification_email

logger = logging.getLogger(__name__)


def create_inquiry(*, user: User, category: str, title: str, content: str) -> Inquiry:
    inquiry = Inquiry.objects.create(
        user=user,
        category=category,
        title=title,
        content=content,
    )

    try:
        send_inquiry_notification_email(inquiry)
    except Exception:
        logger.exception("failed to send inquiry notification email (inquiry_id=%s)", inquiry.pk)

    return inquiry
