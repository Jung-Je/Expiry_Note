from django.urls import path

from apps.support.views import (
    AdminInquiryDetailView,
    AdminInquiryListView,
    InquiryDetailView,
    InquiryListCreateView,
)

urlpatterns = [
    path("inquiries/", InquiryListCreateView.as_view(), name="support-inquiries"),
    path("inquiries/<int:pk>/", InquiryDetailView.as_view(), name="support-inquiry-detail"),
    path("admin/inquiries/", AdminInquiryListView.as_view(), name="support-admin-inquiries"),
    path(
        "admin/inquiries/<int:pk>/",
        AdminInquiryDetailView.as_view(),
        name="support-admin-inquiry-detail",
    ),
]
