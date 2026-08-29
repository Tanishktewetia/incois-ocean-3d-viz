from typing import Any

from fastapi import APIRouter, HTTPException, status

from backend.services.argo import ArgoDataUnavailableError
from backend.services.instruments import (
    InstrumentDataUnavailableError,
    request_instrument_profile,
    request_instruments,
)
from backend.services.slicer import OceanDataUnavailableError

router = APIRouter(prefix="/api/instruments", tags=["instruments"])


@router.get("")
def get_instruments() -> dict[str, Any]:
    try:
        return request_instruments()
    except (ArgoDataUnavailableError, InstrumentDataUnavailableError) as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error


@router.get("/{instrument_id}/profile")
def get_instrument_profile(instrument_id: str) -> dict[str, Any]:
    try:
        return request_instrument_profile(instrument_id)
    except KeyError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instrument profile '{instrument_id}' was not found.",
        ) from error
    except (ArgoDataUnavailableError, InstrumentDataUnavailableError, OceanDataUnavailableError) as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error