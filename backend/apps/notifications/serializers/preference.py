from rest_framework import serializers

from apps.notifications.models import NotificationPreference


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ["push_enabled", "updated_at"]
        read_only_fields = ["updated_at"]
