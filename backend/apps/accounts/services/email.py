"""인증 관련 이메일 발송.

DEBUG 환경에서는 `EMAIL_BACKEND`가 콘솔 백엔드라 실제로 메일이 나가지 않고
런서버 콘솔에 출력된다. 실제 발신용 SMTP/이메일 서비스 연동은 추후 확정.
"""

from django.conf import settings
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.accounts.models import User


def send_verification_email(user: User, token: str) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    link = f"{settings.FRONTEND_URL}/verify-email?uid={uid}&token={token}"
    send_mail(
        subject="[만료노트] 이메일 인증을 완료해주세요",
        message=f"아래 링크를 눌러 이메일 인증을 완료하세요.\n\n{link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )


def send_password_reset_email(user: User, token: str) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
    send_mail(
        subject="[만료노트] 비밀번호 재설정",
        message=f"아래 링크를 눌러 비밀번호를 재설정하세요.\n\n{link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )
