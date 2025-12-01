# api/index.py
"""
Vercel serverless function entry point.
"""
import sys
import os

# Add the parent directory to the path so we can import from backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.app import app

# Vercel expects a handler
handler = app
