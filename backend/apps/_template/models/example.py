from django.db import models


class ExampleModel(models.Model):
    """TODO: replace with a real model.

    One file per feature/domain concept (e.g. `item.py`, `category.py`),
    not one giant `models.py`.
    """

    name = models.CharField(max_length=100)

    class Meta:
        app_label = "_template"  # TODO: match the app's `label` in apps.py
