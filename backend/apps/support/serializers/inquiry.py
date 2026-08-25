from rest_framework import serializers

from apps.support.models import Inquiry


class InquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = Inquiry
        fields = ["id", "category", "title", "content", "created_at"]
        read_only_fields = ["id", "created_at"]
