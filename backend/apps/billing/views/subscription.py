from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.billing.models import Payment
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
    queryset = Payment.objects.select_related("subscription__user").all()


class AdminUserSubscriptionView(APIView):
    """관리자가 결제 없이 특정 유저의 플랜을 바꾼다(무료로 내리기 포함).
    스태프 계정만 접근 가능."""

    permission_classes = [IsAdminUser]

    def patch(self, request, user_id: int):
        user = get_object_or_404(User, pk=user_id)
        serializer = AdminGrantPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            subscription = grant_plan(
                user,
                plan=serializer.validated_data["plan"],
                period_end=serializer.validated_data.get("period_end"),
            )
        except SubscriptionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(AdminSubscriptionSerializer(subscription).data)
