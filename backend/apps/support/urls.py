from django.urls import path

from apps.support.views import AdminInquiryDetailView, AdminInquiryListView, InquiryCreateView

urlpatterns = [
    path("inquiries/", InquiryCreateView.as_view(), name="support-inquiries"),
    path("admin/inquiries/", AdminInquiryListView.as_view(), name="support-admin-inquiries"),
    path(
        "admin/inquiries/<int:pk>/",
        AdminInquiryDetailView.as_view(),
        name="support-admin-inquiry-detail",
    ),
]
