from django.urls import path

from apps._template.views import create_example_view

urlpatterns = [
    path("examples/", create_example_view, name="example-create"),
]
