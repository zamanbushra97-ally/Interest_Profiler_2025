# backend/services/session_store.py
"""
Session storage abstraction for serverless environments.
Uses JWT tokens to encode session state, eliminating need for server-side storage.
"""

import json
import base64
import hmac
import hashlib
import os
from typing import Dict, Any, Optional

# Secret key for signing tokens (in production, use environment variable)
SECRET_KEY = os.getenv("SESSION_SECRET", "your-secret-key-change-in-production")


def encode_session(session_data: Dict[str, Any]) -> str:
    """
    Encode session data into a signed token.
    Client stores this token and sends it back with each request.
    """
    # Convert to JSON and base64 encode
    json_str = json.dumps(session_data, separators=(',', ':'))
    payload = base64.urlsafe_b64encode(json_str.encode()).decode()
    
    # Create signature
    signature = hmac.new(
        SECRET_KEY.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Return token: payload.signature
    return f"{payload}.{signature}"


def decode_session(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a session token.
    Returns None if token is invalid or tampered with.
    """
    try:
        # Split token
        parts = token.split('.')
        if len(parts) != 2:
            return None
        
        payload, signature = parts
        
        # Verify signature
        expected_sig = hmac.new(
            SECRET_KEY.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_sig):
            return None
        
        # Decode payload
        json_str = base64.urlsafe_b64decode(payload.encode()).decode()
        return json.loads(json_str)
    
    except Exception as e:
        print(f"Error decoding session: {e}")
        return None


# For backward compatibility with existing code that uses session IDs
# This is a simple in-memory fallback for development
_memory_sessions: Dict[str, Dict[str, Any]] = {}


def store_session(session_id: str, data: Dict[str, Any]) -> str:
    """
    Store session data and return a token.
    In serverless mode, returns encoded token.
    In development mode, stores in memory and returns session_id.
    """
    # For serverless: encode everything into the token
    token = encode_session(data)
    
    # Also store in memory for development/debugging
    _memory_sessions[session_id] = data
    
    return token


def get_session(session_id_or_token: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve session data from token or session ID.
    """
    # Try as token first
    if '.' in session_id_or_token:
        data = decode_session(session_id_or_token)
        if data:
            return data
    
    # Fall back to memory (development mode)
    return _memory_sessions.get(session_id_or_token)


def delete_session(session_id: str) -> None:
    """Delete session from memory (if present)."""
    _memory_sessions.pop(session_id, None)
