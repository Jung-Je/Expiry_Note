from rest_framework import serializers

from apps.accounts.models import User


class AdminUserSerializer(serializers.ModelSerializer):
    """관리자 화면의 회원 목록. 읽기 전용(조회만 — 쓰기 기능은 아직 없음)."""

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "is_active",
            "is_email_verified",
            "signup_source",
            "date_joined",
        ]
        read_only_fields = fields
