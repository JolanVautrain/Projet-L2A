import subprocess
from pathlib import Path

import pytest


def test_stylelint_css():
    """Exécute Stylelint sur `frontend/src/css`.

    - Essaie `npm run lint:css` d'abord (si script présent)
    - Sinon utilise `npx stylelint "src/css/**/*.css"` en fallback
    - Skippe si `frontend` absent ou `npm` manquant
    """
    repo_root = Path(__file__).resolve().parents[2]
    frontend_dir = repo_root / "frontend"
    css_dir = frontend_dir / "src" / "css"

    if not frontend_dir.exists() or not css_dir.exists():
        pytest.skip("frontend/src/css not found")

    npm_cmd = ["npm", "run", "lint:css"]
    # fallback direct stylelint command; prefer unquoted glob on windows-shell
    npx_cmd = ["npx", "stylelint", "src/css/**/*.css"]

    # Try npm script first
    try:
        proc = subprocess.run(
            npm_cmd,
            cwd=str(frontend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
            text=True,
        )
    except FileNotFoundError:
        pytest.skip("npm not installed in this environment")

    # If npm script succeeded, test passes
    if proc.returncode == 0:
        return

    # If npm script failed because script missing, try to run npx stylelint

    # npm script failed (maybe absent) - try npx stylelint
    try:
        proc2 = subprocess.run(
            npx_cmd,
            cwd=str(frontend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
            text=True,
            shell=False,
        )
    except FileNotFoundError:
        print(proc.stdout)
        pytest.fail(
            "Stylelint via 'npm run lint:css' failed and 'npx' not available"
        )

    print("--- npm run lint:css output ---")
    print(proc.stdout)
    print("--- npx stylelint output ---")
    print(proc2.stdout)
    assert proc2.returncode == 0, "Stylelint found CSS issues (voir sortie)"
