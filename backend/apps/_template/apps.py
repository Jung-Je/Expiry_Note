from django.apps import AppConfig


class TemplateConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    # TODO: rename both of these when you copy this template to a real app.
    name = "apps._template"
    label = "_template"
