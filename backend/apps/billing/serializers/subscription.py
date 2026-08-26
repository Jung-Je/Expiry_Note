from rest_framework import serializers

from apps.billing.models import Payment, Subscription
from apps.billing.services.subscription import PAID_PLANS, PLAN_ITEM_LIMIT


class SubscriptionSerializer(serializers.ModelSerializer):
    # 설정>요금제/사이드바 하단에 "N/5개 사용" 같은 실사용량을 보여주기 위한 값.
    # apps.items를 여기서 직접 참조하지 않도록(순환 임포트 방지) 메서드 안에서만 import한다.
    item_count = serializers.SerializerMethodField()
    item_limit = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = ["plan", "status", "customer_key", "current_period_end", "item_count", "item_limit"]
        read_only_fields = fields

    def get_item_count(self, obj: Subscription) -> int:
        from apps.items.models import ExpiryItem

        return ExpiryItem.objects.filter(user=obj.user).count()

    def get_item_limit(self, obj: Subscription) -> int | None:
        return PLAN_ITEM_LIMIT[obj.plan]


class StartSubscriptionSerializer(serializers.Serializer):
    # 프론트가 토스 JS SDK(payment.requestBillingAuth())로 카드 등록을 마치고
    # 리다이렉트로 받은 일회성 인증 키. billing_key 교환은 백엔드가 한다.
    auth_key = serializers.CharField()
    plan = serializers.ChoiceField(choices=sorted(PAID_PLANS))


class ChangePlanSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=sorted(PAID_PLANS))


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "amount", "status", "order_id", "paid_at", "created_at"]
        read_only_fields = fields
