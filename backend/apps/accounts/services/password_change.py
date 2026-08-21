from apps.accounts.models import User


class InvalidCurrentPassword(Exception):
    pass


def change_password(user: User, *, current_password: str, new_password: str) -> None:
    """Change a logged-in user's password.

    Unlike the reset flow (services/password_reset.py), this requires proof
    of the current password instead of an emailed token.
    """
    if not user.check_password(current_password):
        raise InvalidCurrentPassword
    user.set_password(new_password)
    user.save(update_fields=["password"])
