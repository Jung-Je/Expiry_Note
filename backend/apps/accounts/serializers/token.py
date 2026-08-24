from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer

from apps.accounts.serializers.auth import UserSerializer


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """이메일 기반 로그인. USERNAME_FIELD가 email이라 필드명은 그대로 유지하고,
    응답에 사용자 정보만 얹어서 프론트가 로그인 직후 바로 쓸 수 있게 한다.
    """

    def validate(self, attrs: dict) -> dict:
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class CookieTokenRefreshSerializer(TokenRefreshSerializer):
    """refresh를 요청 바디가 아니라 httpOnly 쿠키에서 읽는다.

    바디에 refresh가 오면(테스트, 서버-투-서버 호출 등 쿠키가 없는 상황)
    그쪽을 우선하고, 없으면 쿠키 값을 쓴다. 뷰(views/auth.py)에서 응답의
    새 refresh를 다시 쿠키로 심어준다.
    """

    refresh = serializers.CharField(required=False)

    def validate(self, attrs: dict) -> dict:
        if not attrs.get("refresh"):
            cookie_name = settings.JWT_REFRESH_COOKIE_NAME
            attrs["refresh"] = self.context["request"].COOKIES.get(cookie_name, "")
        try:
            return super().validate(attrs)
        except ObjectDoesNotExist as exc:
            # 토큰 서명 자체는 유효한데 그 안의 유저가 더 이상 존재하지 않는
            # 경우(회원 탈퇴 후에도 브라우저에 남아있는 refresh 쿠키 등).
            # simplejwt가 User.DoesNotExist를 그대로 던져 500이 나는 걸 막고,
            # 다른 무효 토큰과 똑같이 401로 처리한다.
            raise TokenError("User not found") from exc
