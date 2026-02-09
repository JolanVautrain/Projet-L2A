"""Compatibility shim for tests that import backend.tests.conftest."""

import os
import uuid

TEST_PASSWORD = os.environ.get("TEST_PASSWORD") or f"pw_{uuid.uuid4().hex[:8]}"
