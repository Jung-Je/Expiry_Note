from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.serializers import (
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
