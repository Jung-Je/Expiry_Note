from rest_framework import serializers

from apps.notifications.models import Notification
from apps.notifications.services import AUDIENCE_ALL, AUDIENCE_LABELS


class AdminNoticeSerializer(serializers.Serializer):
    """관리자가 공지를 보낼 때의 입력. 길이 제한은 Notification 컬럼과 맞춘다."""

    title = serializers.CharField(max_length=Notification._meta.get_field("title").max_length)
    message = serializers.CharField(max_length=Notification._meta.get_field("message").max_length)
    audience = serializers.ChoiceField(choices=sorted(AUDIENCE_LABELS), default=AUDIENCE_ALL)
