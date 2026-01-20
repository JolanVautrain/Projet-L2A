import subprocess
from pathlib import Path

import pytest


def test_isort_check():
    """Vérifie que `isort` ne signale pas d'imports mal ordonnés."""
    repo_root = Path(__file__).resolve().parents[2]

    cmd = ["isort", "--check-only", "--diff", "backend"]

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(repo_root),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
    except FileNotFoundError:
        pytest.skip("isort not installed in this environment")

    print(proc.stdout)
    assert (
        proc.returncode == 0
    ), "isort detected import order issues (voir sortie)"
