from typing import Any

import requests
from fastapi import APIRouter, HTTPException, status

from backend.services.hazards import fetch_cyclones

router = APIRouter(prefix="/api/hazards", tags=["hazards"])


@router.get("/cyclones")
def get_cyclones() -> dict[str, Any]:
    try:
        return fetch_cyclones()
    except (requests.RequestException, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GDACS cyclone data is temporarily unavailable.",
        ) from error
