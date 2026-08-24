from rest_framework import serializers

from apps.billing.models import Payment, Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ["plan", "status", "customer_key", "current_period_end"]
        read_only_fields = fields


class StartSubscriptionSerializer(serializers.Serializer):
    # 프론트가 토스 JS SDK(payment.requestBillingAuth())로 카드 등록을 마치고
    # 리다이렉트로 받은 일회성 인증 키. billing_key 교환은 백엔드가 한다.
    auth_key = serializers.CharField()


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "amount", "status", "order_id", "paid_at", "created_at"]
        read_only_fields = fields
