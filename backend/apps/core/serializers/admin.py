from rest_framework import serializers

from apps.accounts.serializers import AdminUserSerializer
from apps.billing.serializers import AdminPaymentSerializer
from apps.core.models import AdminActionLog
from apps.support.serializers import AdminInquirySerializer


class AdminActionLogSerializer(serializers.ModelSerializer):
    # 계정이 지워진 관리자/회원은 null로 내려간다 — 화면에서 "삭제된 계정"으로 보여준다.
    actor_email = serializers.EmailField(source="actor.email", read_only=True, default=None)
    target_user_id = serializers.IntegerField(read_only=True)
    target_user_email = serializers.EmailField(
        source="target_user.email", read_only=True, default=None
    )

    class Meta:
        model = AdminActionLog
        fields = [
            "id",
            "actor_email",
            "action",
            "target_user_id",
            "target_user_email",
            "summary",
            "created_at",
        ]
        read_only_fields = fields


class AdminUserDetailSerializer(serializers.Serializer):
    """apps.core.services.get_admin_user_detail()의 결과를 그대로 내려준다."""

    user = AdminUserSerializer(read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    payments = AdminPaymentSerializer(many=True, read_only=True)
    inquiries = AdminInquirySerializer(many=True, read_only=True)
    logs = AdminActionLogSerializer(many=True, read_only=True)
