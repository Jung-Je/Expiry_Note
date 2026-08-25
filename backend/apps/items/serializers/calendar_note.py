from rest_framework import serializers

from apps.items.models import CalendarNote


class CalendarNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarNote
        fields = ["date", "content", "updated_at"]
        read_only_fields = ["date", "updated_at"]


class CalendarNoteWriteSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=2000)
