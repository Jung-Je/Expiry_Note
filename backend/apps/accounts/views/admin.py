from django.db.models import Q
from rest_framework import generics
from rest_framework.permissions import IsAdminUser

from apps.accounts.models import User
from apps.accounts.serializers import AdminUserSerializer


class AdminUserListView(generics.ListAPIView):
    """관리자 화면의 회원 목록. 스태프 계정만 접근 가능하고, 조회만 된다."""

    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        queryset = User.objects.all().order_by("-date_joined")
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(email__icontains=search) | Q(name__icontains=search))
        return queryset
