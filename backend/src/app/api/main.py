from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.app.utils.settings import ORIGINS
from src.app.api.v1.api import router as api_router

def create_app() -> FastAPI:
    app = FastAPI(
        title="RITM API",
        description="API for the RITM project",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        )
    
    app.include_router(api_router, prefix="/api/v1")
    
    @app.get("/")
    def read_root():
        return {"message": "Hello World"}
    return app

app = create_app()
