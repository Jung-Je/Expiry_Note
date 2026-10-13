from rest_framework import generics
from rest_framework.permissions import IsAdminUser

from apps.core.models import AdminActionLog
from apps.core.pagination import AdminPagination
from apps.core.serializers import AdminActionLogSerializer


class AdminActionLogListView(generics.ListAPIView):
    """관리자 작업 기록. `?action=`으로 작업 종류를 좁힐 수 있다. 조회만 된다."""

    permission_classes = [IsAdminUser]
    serializer_class = AdminActionLogSerializer
    pagination_class = AdminPagination

    def get_queryset(self):
        queryset = AdminActionLog.objects.select_related("actor", "target_user")
        action = self.request.query_params.get("action")
        if action in AdminActionLog.Action.values:
            queryset = queryset.filter(action=action)
        return queryset
