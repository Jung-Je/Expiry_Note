from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.accounts.serializers.auth import UserSerializer


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """이메일 기반 로그인. USERNAME_FIELD가 email이라 필드명은 그대로 유지하고,
    응답에 사용자 정보만 얹어서 프론트가 로그인 직후 바로 쓸 수 있게 한다.
    """

    def validate(self, attrs: dict) -> dict:
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
