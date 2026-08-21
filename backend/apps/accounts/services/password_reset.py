from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from apps.accounts.models import User
from apps.accounts.services.email import send_password_reset_email


class InvalidResetToken(Exception):
    pass


def request_password_reset(*, email: str) -> None:
    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        # 가입 여부를 노출하지 않기 위해 존재하지 않아도 조용히 종료한다.
        return

    token = default_token_generator.make_token(user)
    send_password_reset_email(user, token)


def confirm_password_reset(*, uid: str, token: str, new_password: str) -> User:
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist) as exc:
        raise InvalidResetToken from exc

    if not default_token_generator.check_token(user, token):
        raise InvalidResetToken

    user.set_password(new_password)
    user.save(update_fields=["password"])
    return user
