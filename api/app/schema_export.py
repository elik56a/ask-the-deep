"""Prints the event schema as JSON Schema, for generating the TypeScript types."""

import json
from typing import Any

from app.events import StreamEvent


def _drop_field_titles(schema: Any) -> Any:
    """Field titles make json2ts emit an alias per field (Type1, Threshold1)."""
    if isinstance(schema, dict):
        if "properties" in schema:
            for prop in schema["properties"].values():
                prop.pop("title", None)
        for value in schema.values():
            _drop_field_titles(value)
    elif isinstance(schema, list):
        for item in schema:
            _drop_field_titles(item)
    return schema


if __name__ == "__main__":
    print(
        json.dumps(
            _drop_field_titles(StreamEvent.model_json_schema(mode="serialization")),
            indent=2,
        )
    )
