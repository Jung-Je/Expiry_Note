from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """API가 떠 있고 응답 가능한지 확인하는 간단한 liveness 체크."""
    return Response({"status": "ok"})
