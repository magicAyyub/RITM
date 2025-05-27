from fastapi import APIRouter
from src.app.api.v1.endpoints import (
    item,
    insights
)

router = APIRouter()

router.include_router(item.router, prefix="/item", tags=["item"])
router.include_router(insights.router, prefix="/insights", tags=["insights"])