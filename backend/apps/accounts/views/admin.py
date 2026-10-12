from django.db.models import Q
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser

from apps.accounts.models import User
from apps.accounts.serializers import AdminUserSerializer


class AdminUserListView(generics.ListAPIView):
    """관리자 화면의 회원 목록. 스태프 계정만 접근 가능하고, 조회만 된다."""

    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        queryset = User.objects.select_related("subscription").order_by("-date_joined")
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(email__icontains=search) | Q(name__icontains=search))
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
        serializer.save()
