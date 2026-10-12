from rest_framework import serializers

from apps.items.models import ExpiryItem

# 날짜 입력칸에서 연도를 잘못 친 값(0202년, 20266년 등)을 걸러내는 범위.
# 이런 값이 저장되면 통계·달력·알림이 조용히 어긋난다. 프론트 폼
# (ItemFormPage.tsx)의 검증과 같은 값을 써야 한다.
MIN_DATE_YEAR = 2000
MAX_DATE_YEAR = 2100
MAX_NOTIFY_DAYS_BEFORE = 365


def _validate_year_range(value):
    if value is not None and not MIN_DATE_YEAR <= value.year <= MAX_DATE_YEAR:
        raise serializers.ValidationError(
            f"{MIN_DATE_YEAR}년부터 {MAX_DATE_YEAR}년 사이의 날짜를 입력하세요."
        )
    return value


class ExpiryItemSerializer(serializers.ModelSerializer):
    days_until_expiry = serializers.IntegerField(read_only=True)
    status = serializers.ChoiceField(choices=ExpiryItem.Status.choices, read_only=True)

    class Meta:
        model = ExpiryItem
        fields = [
            "id",
            "title",
            "category",
            "expiry_date",
            "amount",
            "memo",
            "notify_days_before",
            "billing_cycle",
            "contract_end_date",
            "cancel_url",
            "is_cancelled",
            "days_until_expiry",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_expiry_date(self, value):
        return _validate_year_range(value)

    def validate_contract_end_date(self, value):
        # 약정 종료일이 expiry_date보다 빠른 건 막지 않는다 — 약정은 이미
        # 끝났지만 매달 결제는 계속되는 구독이 실제로 있는 경우다.
        return _validate_year_range(value)

    def validate_notify_days_before(self, value):
        if value > MAX_NOTIFY_DAYS_BEFORE:
            raise serializers.ValidationError(f"{MAX_NOTIFY_DAYS_BEFORE} 이하로 입력하세요.")
        return value
