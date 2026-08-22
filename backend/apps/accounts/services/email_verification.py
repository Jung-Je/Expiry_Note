from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from apps.accounts.models import User
from apps.accounts.services.tokens import email_verification_token_generator


class InvalidVerificationToken(Exception):
    pass


def verify_email(*, uid: str, token: str) -> User:
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist) as exc:
        raise InvalidVerificationToken from exc

    if not email_verification_token_generator.check_token(user, token):
        raise InvalidVerificationToken

    user.is_email_verified = True
    user.save(update_fields=["is_email_verified"])
    return user
