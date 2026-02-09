import subprocess
from pathlib import Path

import pytest


def test_mypy_backend():
    """Lance `mypy` sur le package `backend`.

    Skippe si `mypy` absent.
    """
    repo_root = Path(__file__).resolve().parents[2]

    cmd = ["mypy", "backend"]

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(repo_root),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
            text=True,
        )
    except FileNotFoundError:
        pytest.skip("mypy not installed in this environment")

    print(proc.stdout)
    assert proc.returncode == 0, "mypy found type errors (voir sortie)"
