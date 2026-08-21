from apps.accounts.models import User


def withdraw(user: User) -> None:
    """Permanently delete a user's account.

    The user's expiry items and notifications cascade-delete along with the
    row (see ExpiryItem.user / Notification.user), so this removes all of a
    withdrawing user's data in one step.
    """
    user.delete()
