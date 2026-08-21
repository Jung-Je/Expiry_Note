from django.contrib.auth.tokens import PasswordResetTokenGenerator

from apps.accounts.models import User


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """이메일 인증 전용 토큰.

    `PasswordResetTokenGenerator`를 그대로 재사용하되, 해시 값에 비밀번호 대신
    `is_email_verified`를 넣는다 — 인증이 끝나면(또는 재발급하면) 이전 토큰이
    자동으로 무효화된다.
    """

    def _make_hash_value(self, user: User, timestamp: int) -> str:
        return f"{user.pk}{user.is_email_verified}{timestamp}"


email_verification_token_generator = EmailVerificationTokenGenerator()
