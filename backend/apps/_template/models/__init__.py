# Every model class must be imported here so Django's app registry and
# `makemigrations` can discover it — a `models/` package works exactly like
# `models.py` as long as this file imports every model.
from apps._template.models.example import ExampleModel

__all__ = [
    "ExampleModel",
]
