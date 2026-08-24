from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "name", "is_email_verified", "signup_source", "date_joined"]
        read_only_fields = fields


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    name = serializers.CharField(max_length=50)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("이미 가입된 이메일입니다.")
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "비밀번호가 일치하지 않습니다."})
        validate_password(attrs["password"])
        return attrs


class EmailVerificationConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value: str) -> str:
        validate_password(value)
        return value


class KakaoLoginSerializer(serializers.Serializer):
    # 프론트가 Kakao.Auth.authorize()로 받은 인가 코드. access_token 교환은
    # 백엔드가 한다(apps/accounts/services/kakao.py의 exchange_kakao_code).
    code = serializers.CharField()
    # authorize() 호출 때 쓴 redirect_uri와 정확히 같아야 한다(카카오 쪽
    # 검증 대상).
    redirect_uri = serializers.CharField()


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["name"]


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value: str) -> str:
        validate_password(value)
        return value


class LogoutSerializer(serializers.Serializer):
    # 바디에 refresh가 안 오면(쿠키 기반 플로우) 쿠키 값을 대신 쓴다
    # (views/auth.py의 LogoutView 참고).
    refresh = serializers.CharField(required=False)
