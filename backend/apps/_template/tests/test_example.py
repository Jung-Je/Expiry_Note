import pytest

from apps._template.services import create_example


@pytest.mark.django_db
def test_create_example():
    example = create_example(name="test")
    assert example.name == "test"
