from rest_framework.generics import RetrieveUpdateAPIView

from apps.notifications.serializers import NotificationPreferenceSerializer
from apps.notifications.services import get_or_create_preference


class NotificationPreferenceView(RetrieveUpdateAPIView):
    serializer_class = NotificationPreferenceSerializer

    def get_object(self):
        return get_or_create_preference(self.request.user)
