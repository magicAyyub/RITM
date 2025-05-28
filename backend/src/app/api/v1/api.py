from fastapi import APIRouter
from src.app.api.v1.endpoints import (
    insights
)

router = APIRouter()

router.include_router(insights.router, prefix="/insights", tags=["insights"])