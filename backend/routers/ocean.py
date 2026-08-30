from typing import Annotated, Any

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from backend.services.slicer import (
    OceanDataUnavailableError,
    request_currents,
    request_layers,
    request_slice,
    save_upload_stream,
)
from backend.services.bathymetry import get_bathymetry

router = APIRouter(prefix="/api", tags=["ocean"])


@router.get("/bathymetry")
def bathymetry() -> dict[str, Any]:
    try:
        return get_bathymetry()
    except RuntimeError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error


@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_dataset(
    file: UploadFile = File(...),
    dataset_type: str = Form("thetao"),
) -> dict[str, Any]:
    if not isinstance(dataset_type, str):
        dataset_type = "thetao"
    if not file.filename or not file.filename.lower().endswith(".nc"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload must be a NetCDF file with a .nc extension.",
        )
    try:
        return {"filename": file.filename, **save_upload_stream(file.file, dataset_type)}
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
    finally:
        file.file.close()


@router.get("/currents")
def get_currents(time: str | None = None) -> dict[str, Any]:
    try:
        return request_currents(time=time)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.get("/slice")
def get_slice(
    depth: Annotated[float, Query(ge=0, le=2000)] = 0,
    variable: str = "thetao",
    source: str = "demo",
) -> dict[str, Any]:
    try:
        return request_slice(depth=depth, variable=variable, source=source)
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
def get_layers(
    variable: str = "thetao", time: str | None = None, source: str = "demo"
) -> dict[str, Any]:
    try:
        return request_layers(variable=variable, time=time, source=source)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except OceanDataUnavailableError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
