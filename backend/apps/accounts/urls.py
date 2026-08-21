from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import (
    EmailVerificationConfirmView,
    KakaoLoginView,
    LoginView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    SignupView,
)

urlpatterns = [
    path("signup/", SignupView.as_view(), name="auth-signup"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("email/verify/", EmailVerificationConfirmView.as_view(), name="auth-email-verify"),
    path("password/reset/", PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path(
        "password/reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="auth-password-reset-confirm",
    ),
    path("kakao/login/", KakaoLoginView.as_view(), name="auth-kakao-login"),
    path("me/", MeView.as_view(), name="auth-me"),
]
