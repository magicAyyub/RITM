from fastapi import APIRouter
from src.app.api.v1.endpoints import (
    operators
)

router = APIRouter()

router.include_router(operators.router)