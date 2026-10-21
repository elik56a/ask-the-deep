"""Loads this environment's secrets from AWS SSM into environment variables.

In Lambda, `SSM_PREFIX` names one path per environment (/portfolio-chat/prod),
so staging and prod never share a key. Each parameter's last name part becomes
the variable name: /portfolio-chat/prod/GOOGLE_API_KEY -> GOOGLE_API_KEY.
Locally there is no prefix, so nothing is loaded and api/.env is used.
"""

import os
from typing import TYPE_CHECKING

import boto3

if TYPE_CHECKING:
    from mypy_boto3_ssm import SSMClient

# Terraform creates every secret with this value; it means "not set yet".
UNSET = "CHANGE_ME"


def load_ssm_secrets(
    prefix: str | None = None, client: "SSMClient | None" = None
) -> list[str]:
    """Copy every set parameter under the prefix into os.environ.

    Returns the names it loaded (never the values).
    """
    prefix = prefix if prefix is not None else os.environ.get("SSM_PREFIX")
    if not prefix:
        return []
    client = client or boto3.client("ssm")
    pages = client.get_paginator("get_parameters_by_path").paginate(
        Path=prefix, WithDecryption=True
    )
    loaded = []
    for page in pages:
        for param in page["Parameters"]:
            name, value = param["Name"].rsplit("/", 1)[-1], param["Value"]
            if value != UNSET:
                os.environ[name] = value
                loaded.append(name)
    return loaded
