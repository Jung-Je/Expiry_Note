from rest_framework import serializers

from apps.accounts.models import User


class AdminUserSerializer(serializers.ModelSerializer):
    """관리자 화면의 회원 목록/상세. is_active만 쓰기 가능 —
    나머지는 가입 경로/이메일 인증 여부 등 사용자가 직접 바꾸는 값이라
    관리자가 덮어쓸 일이 없다.
    """

    # 요금제는 apps.billing의 Subscription에 있다. 구독 행은 유저가 처음 조회할 때
    # 만들어지므로 없을 수 있고, 그 경우는 무료다. 변경은 여기가 아니라
    # billing의 관리자 API(admin/users/<id>/subscription/)에서 한다.
    plan = serializers.SerializerMethodField()
    plan_period_end = serializers.SerializerMethodField()
    is_plan_admin_granted = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "is_active",
            "is_staff",
            "is_email_verified",
            "signup_source",
            "date_joined",
            "plan",
            "plan_period_end",
            "is_plan_admin_granted",
        ]
        # is_staff는 조회만(관리자 계정인지 프론트가 구분해서 비활성화
        # 버튼을 숨기는 용도) — 다른 관리자로 승격/강등하는 기능은 없다.
        read_only_fields = [
            "id",
            "email",
            "name",
            "is_staff",
            "is_email_verified",
            "signup_source",
            "date_joined",
        ]

    def get_plan(self, obj: User) -> str:
        subscription = getattr(obj, "subscription", None)
        return subscription.plan if subscription else "free"

    def get_plan_period_end(self, obj: User):
        subscription = getattr(obj, "subscription", None)
        return subscription.current_period_end if subscription else None

    def get_is_plan_admin_granted(self, obj: User) -> bool:
        subscription = getattr(obj, "subscription", None)
        return subscription.is_admin_granted if subscription else False
