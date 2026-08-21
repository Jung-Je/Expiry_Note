from apps.notifications.models import NotificationPreference


def get_or_create_preference(user) -> NotificationPreference:
    preference, _ = NotificationPreference.objects.get_or_create(user=user)
    return preference
