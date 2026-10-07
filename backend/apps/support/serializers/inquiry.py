from rest_framework import serializers

from apps.support.models import Inquiry


class InquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = Inquiry
        fields = ["id", "category", "title", "content", "created_at"]
        read_only_fields = ["id", "created_at"]


class AdminInquirySerializer(serializers.ModelSerializer):
    """관리자 화면용. 문의 내용은 전부 읽기 전용이고, is_answered만 수정 가능."""

    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.name", read_only=True)

    class Meta:
        model = Inquiry
        fields = [
            "id",
            "user_email",
            "user_name",
            "category",
            "title",
            "content",
            "is_answered",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user_email",
            "user_name",
            "category",
            "title",
            "content",
            "created_at",
        ]
