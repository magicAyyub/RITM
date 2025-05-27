"""
Run script for the FastAPI application.
"""
import uvicorn

def start():
    """Entry point for running the application."""
    uvicorn.run(
        "src.app.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )