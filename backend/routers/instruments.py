from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.services.argo import ArgoDataUnavailableError
from backend.services.instruments import (
    InstrumentDataUnavailableError,
    request_instrument_profile,
    request_instruments,
    parse_uploaded_instrument_csv,
    parse_uploaded_instrument_netcdf,
)
from backend.services.slicer import OceanDataUnavailableError

router = APIRouter(prefix="/api/instruments", tags=["instruments"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_instruments(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.filename or not file.filename.lower().endswith((".csv", ".nc")):
        raise HTTPException(status_code=400, detail="Instrument upload must be a CSV or NetCDF file.")
    try:
        content = await file.read()
        return parse_uploaded_instrument_netcdf(content, file.filename) if file.filename.lower().endswith(".nc") else parse_uploaded_instrument_csv(content, file.filename)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


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
