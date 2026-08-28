from typing import Any

from fastapi import APIRouter, HTTPException, status

from backend.services.argo import (
    ArgoDataUnavailableError,
    request_argo_profile,
    request_argo_profiles,
)
from backend.services.slicer import OceanDataUnavailableError

router = APIRouter(prefix="/api/argo", tags=["argo"])


@router.get("")
def get_argo_profiles() -> dict[str, Any]:
    try:
        return request_argo_profiles()
    except ArgoDataUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)
        ) from error


@router.get("/{profile_id}/profile")
def get_argo_profile(profile_id: str) -> dict[str, Any]:
    try:
        return request_argo_profile(profile_id)
    except KeyError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Argo profile '{profile_id}' was not found.",
        ) from error
    except (ArgoDataUnavailableError, OceanDataUnavailableError) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)
        ) from error
