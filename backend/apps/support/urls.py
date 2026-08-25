from django.urls import path

from apps.support.views import InquiryCreateView

urlpatterns = [
    path("inquiries/", InquiryCreateView.as_view(), name="support-inquiries"),
]
