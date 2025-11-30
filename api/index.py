# api/index.py
"""
Vercel serverless function entry point.
This file is required for Vercel to properly route requests to the FastAPI app.
"""

from backend.app import app

# Vercel expects a variable named 'app' or 'handler'
# FastAPI app can be used directly as ASGI application
handler = app
