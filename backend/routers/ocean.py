from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, status

from backend.services.slicer import (
    OceanDataUnavailableError,
    request_layers,
    request_slice,
)

router = APIRouter(prefix="/api", tags=["ocean"])


@router.get("/slice")
def get_slice(
    depth: Annotated[float, Query(ge=0, le=2000)] = 0,
    variable: str = "thetao",
) -> dict[str, Any]:
    try:
        return request_slice(depth=depth, variable=variable)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except OceanDataUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error


@router.get("/layers")
def get_layers(variable: str = "thetao") -> dict[str, Any]:
    try:
        return request_layers(variable=variable)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except OceanDataUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
