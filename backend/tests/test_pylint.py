import subprocess
from pathlib import Path

import pytest


def test_pylint_backend():
    """Lance `pylint` sur le package `backend`.

    Skippe le test si `pylint` n'est pas installé.
    """
    repo_root = Path(__file__).resolve().parents[2]
    backend_dir = repo_root / "backend"

    cmd = ["pylint", "backend"]

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(repo_root),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
    except FileNotFoundError:
        pytest.skip("pylint not installed in this environment")

    print(proc.stdout)
    assert proc.returncode == 0, "pylint found issues (voir sortie)"
