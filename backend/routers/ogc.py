from urllib.parse import parse_qsl

from fastapi import APIRouter, Request
from fastapi.responses import Response

from backend.services.ogc import (
    WCS_VERSION,
    WMS_VERSION,
    describe_coverage,
    exception_report,
    get_coverage,
    render_wms_map,
    wcs_capabilities,
    wms_capabilities,
)
from backend.services.slicer import OceanDataUnavailableError


router = APIRouter(tags=["OGC"])


def _parameters(request: Request) -> tuple[dict[str, str], list[str]]:
    pairs = parse_qsl(request.url.query, keep_blank_values=True)
    parameters = {key.upper(): value for key, value in pairs}
    subsets = [value for key, value in pairs if key.upper() == "SUBSET"]
    return parameters, subsets


def _service_url(request: Request) -> str:
    return str(request.url.replace(query=""))


def _error(service: str, code: str, message: str, locator: str = "REQUEST", status_code: int = 400) -> Response:
    return Response(
        exception_report(service, code, message, locator),
        status_code=status_code,
        media_type="application/xml",
    )


@router.get("/wms")
def wms(request: Request) -> Response:
    parameters, _ = _parameters(request)
    operation = parameters.get("REQUEST", "GetCapabilities").lower()
    try:
        if operation == "getcapabilities":
            return Response(wms_capabilities(_service_url(request)), media_type="application/xml")
        if operation != "getmap":
            return _error("WMS", "OperationNotSupported", f"Unsupported REQUEST '{parameters.get('REQUEST', '')}'.")
        required = [name for name in ("LAYERS", "BBOX", "WIDTH", "HEIGHT") if not parameters.get(name)]
        if required:
            return _error("WMS", "MissingParameterValue", f"Missing required parameter(s): {', '.join(required)}.", required[0])
        image_format = parameters.get("FORMAT", "image/png").lower()
        if image_format != "image/png":
            return _error("WMS", "InvalidFormat", "Only FORMAT=image/png is supported.", "FORMAT")
        crs = parameters.get("CRS", parameters.get("SRS", "EPSG:4326")).upper()
        if crs not in {"EPSG:4326", "CRS:84"}:
            return _error("WMS", "InvalidCRS", "Supported coordinate systems are EPSG:4326 and CRS:84.", "CRS")
        try:
            bounds = tuple(float(value) for value in parameters["BBOX"].split(","))
            if len(bounds) != 4:
                raise ValueError
            width = int(parameters["WIDTH"])
            height = int(parameters["HEIGHT"])
            elevation = float(parameters["ELEVATION"]) if parameters.get("ELEVATION") else None
        except ValueError:
            return _error("WMS", "InvalidParameterValue", "BBOX, WIDTH, HEIGHT, or ELEVATION is invalid.")
        version = parameters.get("VERSION", WMS_VERSION)
        if version.startswith("1.3") and crs == "EPSG:4326":
            south, west, north, east = bounds
            bounds = (west, south, east, north)
        png = render_wms_map(
            parameters["LAYERS"].split(",")[0], bounds, width, height,
            parameters.get("TIME"), elevation,
            parameters.get("TRANSPARENT", "TRUE").upper() == "TRUE",
        )
        return Response(png, media_type="image/png")
    except ValueError as error:
        return _error("WMS", "InvalidParameterValue", str(error))
    except OceanDataUnavailableError as error:
        return _error("WMS", "NoApplicableCode", str(error), status_code=503)


@router.get("/wcs")
def wcs(request: Request) -> Response:
    parameters, subsets = _parameters(request)
    operation = parameters.get("REQUEST", "GetCapabilities").lower()
    try:
        if operation == "getcapabilities":
            return Response(wcs_capabilities(_service_url(request)), media_type="application/xml")
        if operation == "describecoverage":
            coverage_id = parameters.get("COVERAGEID")
            if not coverage_id:
                return _error("WCS", "MissingParameterValue", "COVERAGEID is required.", "COVERAGEID")
            return Response(describe_coverage(coverage_id), media_type="application/xml")
        if operation == "getcoverage":
            coverage_id = parameters.get("COVERAGEID")
            if not coverage_id:
                return _error("WCS", "MissingParameterValue", "COVERAGEID is required.", "COVERAGEID")
            output_format = parameters.get("FORMAT", "application/x-netcdf").lower()
            if output_format not in {"application/x-netcdf", "application/netcdf"}:
                return _error("WCS", "InvalidParameterValue", "Only NetCDF output is supported.", "FORMAT")
            content = get_coverage(coverage_id, subsets)
            headers = {"Content-Disposition": f'attachment; filename="{coverage_id}.nc"'}
            return Response(content, media_type="application/x-netcdf", headers=headers)
        return _error("WCS", "OperationNotSupported", f"Unsupported REQUEST '{parameters.get('REQUEST', '')}'.")
    except (TypeError, ValueError) as error:
        return _error("WCS", "InvalidParameterValue", str(error))
    except OceanDataUnavailableError as error:
        return _error("WCS", "NoApplicableCode", str(error), status_code=503)