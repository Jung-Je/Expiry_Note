from django.db.models import Q
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser

from apps.accounts.models import User
from apps.accounts.serializers import AdminUserSerializer
from apps.core.models import AdminActionLog
from apps.core.pagination import AdminPagination
from apps.core.services import record_admin_action

# apps.billing.models.Subscription.Plan의 값. 구독 행이 없는 유저도 무료로
# 쳐야 해서 단순 필드 비교가 아니라 아래에서 따로 처리한다.
_PLAN_VALUES = {"free", "basic", "pro"}
_TRUE_VALUES = {"1", "true"}
_FALSE_VALUES = {"0", "false"}


class AdminUserListView(generics.ListAPIView):
    """관리자 화면의 회원 목록. 스태프 계정만 접근 가능하고, 조회만 된다.

    `?search=`(이메일·이름), `?plan=`, `?signup_source=`, `?is_active=`로
    좁힐 수 있고 전부 함께 쓸 수 있다. 모르는 값은 무시한다.
    """

    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    pagination_class = AdminPagination

    def get_queryset(self):
        queryset = User.objects.select_related("subscription").order_by("-date_joined", "-id")
        params = self.request.query_params

        search = params.get("search")
        if search:
            queryset = queryset.filter(Q(email__icontains=search) | Q(name__icontains=search))

        plan = params.get("plan")
        if plan == "free":
            # 구독 행은 요금제 화면을 처음 열 때 생기므로, 없는 유저도 무료다.
            queryset = queryset.filter(Q(subscription__isnull=True) | Q(subscription__plan="free"))
        elif plan in _PLAN_VALUES:
            queryset = queryset.filter(subscription__plan=plan)

        signup_source = params.get("signup_source")
        if signup_source in User.SignupSource.values:
            queryset = queryset.filter(signup_source=signup_source)

        is_active = (params.get("is_active") or "").lower()
        if is_active in _TRUE_VALUES:
            queryset = queryset.filter(is_active=True)
        elif is_active in _FALSE_VALUES:
            queryset = queryset.filter(is_active=False)

        return queryset


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """회원 상세 조회 + is_active 토글(계정 비활성화/재활성화).

    관리자/최고관리자 계정과 본인 계정은 여기서 바꿀 수 없다 — 실수로
    관리자 본인이나 다른 관리자를 잠그는 사고를 막기 위한 안전장치.
    """

    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    queryset = User.objects.select_related("subscription")

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance.is_staff or instance.is_superuser:
            raise ValidationError("관리자 계정은 여기서 상태를 바꿀 수 없습니다.")
        if instance == self.request.user:
            raise ValidationError("본인 계정은 여기서 상태를 바꿀 수 없습니다.")

        was_active = instance.is_active
        user = serializer.save()
        # 같은 값으로 다시 저장한 경우는 한 일이 없으므로 기록하지 않는다.
        if user.is_active != was_active:
            record_admin_action(
                actor=self.request.user,
                action=(
                    AdminActionLog.Action.USER_REACTIVATE
                    if user.is_active
                    else AdminActionLog.Action.USER_DEACTIVATE
                ),
                target_user=user,
            )
