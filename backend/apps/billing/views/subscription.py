from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.billing.models import Payment, Subscription
from apps.billing.serializers import (
    AdminGrantPlanSerializer,
    AdminPaymentSerializer,
    AdminSubscriptionSerializer,
    ChangePlanSerializer,
    PaymentSerializer,
    StartSubscriptionSerializer,
    SubscriptionSerializer,
)
from apps.billing.services import (
    SubscriptionError,
    cancel_subscription,
    change_plan,
    get_or_create_subscription,
    grant_plan,
    start_subscription,
)
from apps.core.models import AdminActionLog
from apps.core.pagination import AdminPagination
from apps.core.services import record_admin_action


class SubscriptionView(APIView):
    def get(self, request):
        subscription = get_or_create_subscription(request.user)
        return Response(SubscriptionSerializer(subscription).data)


class SubscribeView(APIView):
    throttle_scope = "billing-subscribe"

    def post(self, request):
        serializer = StartSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            subscription = start_subscription(
                request.user,
                auth_key=serializer.validated_data["auth_key"],
                plan=serializer.validated_data["plan"],
            )
        except SubscriptionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SubscriptionSerializer(subscription).data)


class ChangePlanView(APIView):
    throttle_scope = "billing-subscribe"

    def post(self, request):
        serializer = ChangePlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            subscription = change_plan(request.user, plan=serializer.validated_data["plan"])
        except SubscriptionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SubscriptionSerializer(subscription).data)


class CancelSubscriptionView(APIView):
    def post(self, request):
        try:
            subscription = cancel_subscription(request.user)
        except SubscriptionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SubscriptionSerializer(subscription).data)


class PaymentListView(generics.ListAPIView):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        subscription = get_or_create_subscription(self.request.user)
        return subscription.payments.all()


class AdminPaymentListView(generics.ListAPIView):
    """관리자 화면의 결제 내역. 전체 유저 대상, 스태프 계정만 접근 가능."""

    permission_classes = [IsAdminUser]
    serializer_class = AdminPaymentSerializer
    pagination_class = AdminPagination
    queryset = Payment.objects.select_related("subscription__user").order_by("-created_at", "-id")


class AdminUserSubscriptionView(APIView):
    """관리자가 결제 없이 특정 유저의 플랜을 바꾼다(무료로 내리기 포함).
    스태프 계정만 접근 가능."""

    permission_classes = [IsAdminUser]

    def patch(self, request, user_id: int):
        user = get_object_or_404(User, pk=user_id)
        serializer = AdminGrantPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        before = _grant_state(get_or_create_subscription(user))
        try:
            subscription = grant_plan(
                user,
                plan=serializer.validated_data["plan"],
                period_end=serializer.validated_data.get("period_end"),
            )
        except SubscriptionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        # 같은 내용으로 다시 저장한 경우는 한 일이 없으므로 기록하지 않는다.
        if _grant_state(subscription) != before:
            record_admin_action(
                actor=request.user,
                action=AdminActionLog.Action.PLAN_GRANT,
                target_user=user,
                summary=_describe_grant(subscription),
            )
        return Response(AdminSubscriptionSerializer(subscription).data)


def _grant_state(subscription: Subscription) -> tuple:
    return (subscription.plan, subscription.is_admin_granted, subscription.current_period_end)


def _describe_grant(subscription: Subscription) -> str:
    plan_label = f"{subscription.get_plan_display()} 플랜"
    if subscription.plan == Subscription.Plan.FREE:
        return plan_label
    if subscription.current_period_end:
        return f"{plan_label} · {subscription.current_period_end}까지"
    return f"{plan_label} · 기간 제한 없음"
