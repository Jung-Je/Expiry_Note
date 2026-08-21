"""Business logic for the "example" feature.

Keep views thin: a view parses the request, calls a service function, then
serializes the result. Anything that isn't pure request/response handling
(validation against other data, side effects, orchestration across models)
belongs in a service function, not in the view or serializer.
"""

from apps._template.models import ExampleModel


def create_example(*, name: str) -> ExampleModel:
    return ExampleModel.objects.create(name=name)
