from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user)
        unread = self.request.query_params.get("unread")
        if unread is not None and unread.lower() in ("1", "true"):
            queryset = queryset.filter(is_read=False)
        return queryset


class NotificationMarkReadView(APIView):
    def post(self, request, pk):
        notification = generics.get_object_or_404(
            Notification.objects.filter(user=request.user), pk=pk
        )
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(APIView):
    def post(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"updated_count": updated}, status=status.HTTP_200_OK)
