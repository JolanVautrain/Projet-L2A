"""WSGI entry point for Gunicorn."""
import sys
from pathlib import Path

# Add the app directory to the Python path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Import the Flask app
from app import app

if __name__ == "__main__":
    app.run()
