"""
Configuration settings for the application.
"""

from typing import List


ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:3000/api",
    "http://localhost:3000/api/v1",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3000/api",
    "http://127.0.0.1:3000/api/v1",
    "http://0.0.0.0:3000",
    "http://0.0.0.0:3000/api",  
    "http://0.0.0.0:3000/api/v1",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8000/api",
    "http://127.0.0.1:8000/api/v1",
    "http://0.0.0.0:8000",
    "http://0.0.0.0:8000/api",
    "http://0.0.0.0:8000/api/v1",
]