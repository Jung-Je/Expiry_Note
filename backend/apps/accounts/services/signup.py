from apps.accounts.models import User
from apps.accounts.services.email import send_verification_email
from apps.accounts.services.tokens import email_verification_token_generator


def signup(*, email: str, password: str, name: str) -> User:
    user = User.objects.create_user(email=email, password=password, name=name)
    token = email_verification_token_generator.make_token(user)
    send_verification_email(user, token)
    return user
