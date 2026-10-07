from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """API가 떠 있고 응답 가능한지 확인하는 간단한 liveness 체크.

    CI/CD 자동 배포(.github/workflows/deploy.yml)가 제대로 도는지 확인할
    때도 쓴다 — main에 이 파일이 바뀐 채로 merge되면 자동 재배포된다.
    """
    return Response({"status": "ok"})
