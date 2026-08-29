from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from xml.etree import ElementTree as ET

import numpy as np
from PIL import Image
import xarray as xr

from backend.services.slicer import SUPPORTED_VARIABLES, select_variable


WMS_VERSION = "1.3.0"
WCS_VERSION = "2.0.1"
MAX_MAP_SIZE = 2048
LAYER_TITLES = {
    "thetao": "Sea Water Potential Temperature",
    "so": "Sea Water Salinity",
    "current_magnitude": "Sea Water Current Speed",
}
COLOR_STOPS = np.asarray(
    [[0, 29, 108], [0, 170, 220], [255, 224, 92], [205, 38, 38]],
    dtype=float,
)

WMS = "http://www.opengis.net/wms"
WCS = "http://www.opengis.net/wcs/2.0"
OWS = "http://www.opengis.net/ows/2.0"
GML = "http://www.opengis.net/gml/3.2"
GMLCOV = "http://www.opengis.net/gmlcov/1.0"
SWE = "http://www.opengis.net/swe/2.0"
XLINK = "http://www.w3.org/1999/xlink"
XSI = "http://www.w3.org/2001/XMLSchema-instance"

for prefix, namespace in (
    ("", WMS), ("wcs", WCS), ("ows", OWS), ("gml", GML),
    ("gmlcov", GMLCOV), ("swe", SWE), ("xlink", XLINK), ("xsi", XSI),
):
    ET.register_namespace(prefix, namespace)


def _xml(root: ET.Element) -> bytes:
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def _element(parent: ET.Element, tag: str, text: Any = None, **attributes: Any) -> ET.Element:
    child = ET.SubElement(parent, tag, {key: str(value) for key, value in attributes.items()})
    if text is not None:
        child.text = str(text)
    return child


def _iso_time(value: Any) -> str:
    return np.datetime_as_string(np.datetime64(value), unit="s") + "Z"


def _metadata(variable: str) -> dict[str, Any]:
    field = select_variable(variable, "demo")
    return {
        "field": field,
        "title": LAYER_TITLES[variable],
        "unit": field.attrs.get("units", ""),
        "west": float(field.longitude.min()),
        "east": float(field.longitude.max()),
        "south": float(field.latitude.min()),
        "north": float(field.latitude.max()),
        "depths": [float(value) for value in field.depth.values],
        "times": [_iso_time(value) for value in field.time.values],
    }


def wms_capabilities(service_url: str) -> bytes:
    root = ET.Element(
        f"{{{WMS}}}WMS_Capabilities",
        {
            "version": WMS_VERSION,
            f"{{{XSI}}}schemaLocation": f"{WMS} https://schemas.opengis.net/wms/1.3.0/capabilities_1_3_0.xsd",
        },
    )
    service = _element(root, f"{{{WMS}}}Service")
    _element(service, f"{{{WMS}}}Name", "WMS")
    _element(service, f"{{{WMS}}}Title", "INCOIS Ocean 3D Visualization WMS")
    _element(service, f"{{{WMS}}}Abstract", "Copernicus Marine model fields for the India EEZ.")
    _element(service, f"{{{WMS}}}OnlineResource", **{f"{{{XLINK}}}type": "simple", f"{{{XLINK}}}href": service_url})
    _element(service, f"{{{WMS}}}Fees", "none")
    _element(service, f"{{{WMS}}}AccessConstraints", "none")

    capability = _element(root, f"{{{WMS}}}Capability")
    request = _element(capability, f"{{{WMS}}}Request")
    for operation, formats in (("GetCapabilities", ["text/xml"]), ("GetMap", ["image/png"])):
        operation_node = _element(request, f"{{{WMS}}}{operation}")
        for response_format in formats:
            _element(operation_node, f"{{{WMS}}}Format", response_format)
        dcp = _element(operation_node, f"{{{WMS}}}DCPType")
        http = _element(dcp, f"{{{WMS}}}HTTP")
        get = _element(http, f"{{{WMS}}}Get")
        _element(get, f"{{{WMS}}}OnlineResource", **{f"{{{XLINK}}}type": "simple", f"{{{XLINK}}}href": service_url})
    exception = _element(capability, f"{{{WMS}}}Exception")
    _element(exception, f"{{{WMS}}}Format", "XML")

    parent = _element(capability, f"{{{WMS}}}Layer")
    _element(parent, f"{{{WMS}}}Title", "India EEZ Ocean Model Fields")
    _element(parent, f"{{{WMS}}}CRS", "EPSG:4326")
    _element(parent, f"{{{WMS}}}CRS", "CRS:84")
    for variable in sorted(SUPPORTED_VARIABLES):
        metadata = _metadata(variable)
        layer = _element(parent, f"{{{WMS}}}Layer", queryable="0", opaque="0")
        _element(layer, f"{{{WMS}}}Name", variable)
        _element(layer, f"{{{WMS}}}Title", metadata["title"])
        _element(layer, f"{{{WMS}}}CRS", "EPSG:4326")
        _element(layer, f"{{{WMS}}}CRS", "CRS:84")
        geographic = _element(layer, f"{{{WMS}}}EX_GeographicBoundingBox")
        _element(geographic, f"{{{WMS}}}westBoundLongitude", metadata["west"])
        _element(geographic, f"{{{WMS}}}eastBoundLongitude", metadata["east"])
        _element(geographic, f"{{{WMS}}}southBoundLatitude", metadata["south"])
        _element(geographic, f"{{{WMS}}}northBoundLatitude", metadata["north"])
        _element(
            layer, f"{{{WMS}}}BoundingBox", CRS="EPSG:4326",
            minx=metadata["south"], miny=metadata["west"],
            maxx=metadata["north"], maxy=metadata["east"],
        )
        _element(
            layer, f"{{{WMS}}}BoundingBox", CRS="CRS:84",
            minx=metadata["west"], miny=metadata["south"],
            maxx=metadata["east"], maxy=metadata["north"],
        )
        _element(
            layer, f"{{{WMS}}}Dimension", ",".join(metadata["times"]),
            name="time", units="ISO8601", default=metadata["times"][-1], nearestValue="1",
        )
        _element(
            layer, f"{{{WMS}}}Dimension", ",".join(str(value) for value in metadata["depths"]),
            name="elevation", units="EPSG:5030", unitSymbol="m",
            default=metadata["depths"][0], nearestValue="1",
        )
        style = _element(layer, f"{{{WMS}}}Style")
        _element(style, f"{{{WMS}}}Name", "ocean")
        _element(style, f"{{{WMS}}}Title", "Blue-to-red ocean scale")
    return _xml(root)


def _nearest_indices(coordinates: np.ndarray, targets: np.ndarray) -> np.ndarray:
    ascending = coordinates[0] <= coordinates[-1]
    values = coordinates if ascending else coordinates[::-1]
    upper = np.searchsorted(values, targets, side="left")
    upper = np.clip(upper, 0, len(values) - 1)
    lower = np.clip(upper - 1, 0, len(values) - 1)
    choose_lower = np.abs(targets - values[lower]) <= np.abs(values[upper] - targets)
    indices = np.where(choose_lower, lower, upper)
    return indices if ascending else len(values) - 1 - indices


def _rgba(values: np.ndarray, transparent: bool) -> np.ndarray:
    finite = np.isfinite(values)
    rgba = np.zeros((*values.shape, 4), dtype=np.uint8)
    if finite.any():
        minimum = float(np.nanmin(values))
        maximum = float(np.nanmax(values))
        normalized = np.zeros_like(values, dtype=float) if maximum == minimum else (values - minimum) / (maximum - minimum)
        scaled = np.where(finite, np.clip(normalized, 0, 1), 0) * (len(COLOR_STOPS) - 1)
        lower = np.floor(scaled).astype(int)
        upper = np.minimum(lower + 1, len(COLOR_STOPS) - 1)
        amount = (scaled - lower)[..., None]
        colors = COLOR_STOPS[lower] * (1 - amount) + COLOR_STOPS[upper] * amount
        rgba[..., :3] = np.where(finite[..., None], colors, 255).astype(np.uint8)
        rgba[..., 3] = np.where(finite, 255, 0 if transparent else 255).astype(np.uint8)
    elif not transparent:
        rgba[:] = 255
    return rgba


def render_wms_map(
    variable: str,
    bbox: tuple[float, float, float, float],
    width: int,
    height: int,
    time: str | None,
    elevation: float | None,
    transparent: bool,
) -> bytes:
    if variable not in SUPPORTED_VARIABLES:
        raise ValueError(f"Unknown layer '{variable}'.")
    if not 1 <= width <= MAX_MAP_SIZE or not 1 <= height <= MAX_MAP_SIZE:
        raise ValueError(f"WIDTH and HEIGHT must be between 1 and {MAX_MAP_SIZE}.")
    west, south, east, north = bbox
    if west >= east or south >= north:
        raise ValueError("BBOX must have increasing longitude and latitude bounds.")

    field = select_variable(variable, "demo")
    try:
        selected = field.sel(time=np.datetime64(time.removesuffix("Z")), method="nearest") if time else field.isel(time=-1)
    except ValueError as error:
        raise ValueError(f"Invalid TIME '{time}'. Use an ISO 8601 timestamp.") from error
    selected = selected.sel(depth=elevation if elevation is not None else float(field.depth.values[0]), method="nearest")
    longitudes = west + (np.arange(width) + 0.5) * (east - west) / width
    latitudes = north - (np.arange(height) + 0.5) * (north - south) / height
    valid_x = (longitudes >= float(field.longitude.min())) & (longitudes <= float(field.longitude.max()))
    valid_y = (latitudes >= float(field.latitude.min())) & (latitudes <= float(field.latitude.max()))
    x_indices = _nearest_indices(np.asarray(field.longitude.values), longitudes)
    y_indices = _nearest_indices(np.asarray(field.latitude.values), latitudes)
    values = np.asarray(selected.values, dtype=float)[np.ix_(y_indices, x_indices)]
    values[~np.outer(valid_y, valid_x)] = np.nan
    image = Image.fromarray(_rgba(values, transparent), mode="RGBA")
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def wcs_capabilities(service_url: str) -> bytes:
    root = ET.Element(
        f"{{{WCS}}}Capabilities",
        {
            "version": WCS_VERSION,
            f"{{{XSI}}}schemaLocation": f"{WCS} https://schemas.opengis.net/wcs/2.0/wcsAll.xsd",
        },
    )
    identification = _element(root, f"{{{OWS}}}ServiceIdentification")
    _element(identification, f"{{{OWS}}}Title", "INCOIS Ocean 3D Visualization WCS")
    _element(identification, f"{{{OWS}}}ServiceType", "WCS")
    _element(identification, f"{{{OWS}}}ServiceTypeVersion", WCS_VERSION)
    provider = _element(root, f"{{{OWS}}}ServiceProvider")
    _element(provider, f"{{{OWS}}}ProviderName", "INCOIS Ocean 3D Visualization Platform")
    operations = _element(root, f"{{{OWS}}}OperationsMetadata")
    for name in ("GetCapabilities", "DescribeCoverage", "GetCoverage"):
        operation = _element(operations, f"{{{OWS}}}Operation", name=name)
        dcp = _element(operation, f"{{{OWS}}}DCP")
        http = _element(dcp, f"{{{OWS}}}HTTP")
        _element(http, f"{{{OWS}}}Get", **{f"{{{XLINK}}}href": service_url})
    contents = _element(root, f"{{{WCS}}}Contents")
    for variable in sorted(SUPPORTED_VARIABLES):
        metadata = _metadata(variable)
        summary = _element(contents, f"{{{WCS}}}CoverageSummary")
        _element(summary, f"{{{OWS}}}Title", metadata["title"])
        _element(summary, f"{{{WCS}}}CoverageId", variable)
        bounds = _element(summary, f"{{{OWS}}}WGS84BoundingBox", dimensions="2")
        _element(bounds, f"{{{OWS}}}LowerCorner", f"{metadata['west']} {metadata['south']}")
        _element(bounds, f"{{{OWS}}}UpperCorner", f"{metadata['east']} {metadata['north']}")
    service_metadata = _element(root, f"{{{WCS}}}ServiceMetadata")
    _element(service_metadata, f"{{{WCS}}}formatSupported", "application/x-netcdf")
    return _xml(root)


def describe_coverage(variable: str) -> bytes:
    if variable not in SUPPORTED_VARIABLES:
        raise ValueError(f"Unknown COVERAGEID '{variable}'.")
    metadata = _metadata(variable)
    root = ET.Element(
        f"{{{WCS}}}CoverageDescriptions",
        {f"{{{XSI}}}schemaLocation": f"{WCS} https://schemas.opengis.net/wcs/2.0/wcsDescribeCoverage.xsd"},
    )
    coverage = _element(
        root,
        f"{{{WCS}}}CoverageDescription",
        **{f"{{{GML}}}id": f"coverage-{variable}"},
    )
    _element(coverage, f"{{{GML}}}description", metadata["title"])
    bounded = _element(coverage, f"{{{GML}}}boundedBy")
    envelope = _element(
        bounded, f"{{{GML}}}Envelope", srsName="http://www.opengis.net/def/crs/EPSG/0/4326",
        axisLabels="Lat Long", uomLabels="deg deg", srsDimension="2",
    )
    _element(envelope, f"{{{GML}}}lowerCorner", f"{metadata['south']} {metadata['west']}")
    _element(envelope, f"{{{GML}}}upperCorner", f"{metadata['north']} {metadata['east']}")
    _element(coverage, f"{{{WCS}}}CoverageId", variable)
    domain = _element(coverage, f"{{{GML}}}domainSet")
    grid = _element(domain, f"{{{GML}}}Grid", dimension="4", **{f"{{{GML}}}id": f"grid-{variable}"})
    limits = _element(grid, f"{{{GML}}}limits")
    envelope_grid = _element(limits, f"{{{GML}}}GridEnvelope")
    field = metadata["field"]
    _element(envelope_grid, f"{{{GML}}}low", "0 0 0 0")
    _element(envelope_grid, f"{{{GML}}}high", " ".join(str(field.sizes[name] - 1) for name in ("time", "depth", "latitude", "longitude")))
    _element(grid, f"{{{GML}}}axisLabels", "time depth Lat Long")
    range_type = _element(coverage, f"{{{GMLCOV}}}rangeType")
    record = _element(range_type, f"{{{SWE}}}DataRecord")
    field_node = _element(record, f"{{{SWE}}}field", name=variable)
    quantity = _element(field_node, f"{{{SWE}}}Quantity")
    _element(quantity, f"{{{SWE}}}label", metadata["title"])
    _element(quantity, f"{{{SWE}}}uom", code=metadata["unit"] or "1")
    service_parameters = _element(coverage, f"{{{WCS}}}ServiceParameters")
    _element(service_parameters, f"{{{WCS}}}CoverageSubtype", "GridCoverage")
    _element(service_parameters, f"{{{WCS}}}nativeFormat", "application/x-netcdf")
    return _xml(root)


def _parse_subset(expression: str) -> tuple[str, str, str | None]:
    if "(" not in expression or not expression.endswith(")"):
        raise ValueError(f"Invalid SUBSET '{expression}'.")
    axis, values = expression.split("(", 1)
    parts = [part.strip().strip('"') for part in values[:-1].split(",")]
    if len(parts) not in (1, 2) or not all(parts):
        raise ValueError(f"Invalid SUBSET '{expression}'.")
    return axis.strip().lower(), parts[0], parts[1] if len(parts) == 2 else None


def _subset_coverage(field: xr.DataArray, subsets: list[str]) -> xr.DataArray:
    axis_names = {
        "long": "longitude", "longitude": "longitude", "lon": "longitude", "x": "longitude",
        "lat": "latitude", "latitude": "latitude", "y": "latitude",
        "depth": "depth", "elevation": "depth", "time": "time",
    }
    result = field
    seen: set[str] = set()
    for expression in subsets:
        axis, lower, upper = _parse_subset(expression)
        if axis not in axis_names:
            raise ValueError(f"Unsupported SUBSET axis '{axis}'.")
        coordinate = axis_names[axis]
        if coordinate in seen:
            raise ValueError(f"SUBSET axis '{coordinate}' was provided more than once.")
        seen.add(coordinate)
        if coordinate == "time":
            start = np.datetime64(lower.removesuffix("Z"))
            stop = np.datetime64(upper.removesuffix("Z")) if upper else None
        else:
            try:
                start = float(lower)
                stop = float(upper) if upper else None
            except ValueError as error:
                raise ValueError(f"Invalid numeric SUBSET '{expression}'.") from error
        if stop is not None and start > stop:
            raise ValueError(f"SUBSET lower bound exceeds upper bound in '{expression}'.")
        if stop is None:
            result = result.sel({coordinate: [start]}, method="nearest")
            continue
        values = result[coordinate].values
        ascending = values[0] <= values[-1]
        result = result.sel({coordinate: slice(start, stop) if ascending else slice(stop, start)})
    if any(size == 0 for size in result.sizes.values()):
        raise ValueError("The requested SUBSET does not intersect the coverage.")
    return result


def get_coverage(variable: str, subsets: list[str]) -> bytes:
    if variable not in SUPPORTED_VARIABLES:
        raise ValueError(f"Unknown COVERAGEID '{variable}'.")
    field = _subset_coverage(select_variable(variable, "demo"), subsets).copy()
    field.name = variable
    field.attrs.update(
        {
            "long_name": LAYER_TITLES[variable],
            "grid_mapping": "crs",
        }
    )
    dataset = field.to_dataset()
    dataset["crs"] = xr.DataArray(
        0,
        attrs={
            "grid_mapping_name": "latitude_longitude",
            "epsg_code": "EPSG:4326",
            "semi_major_axis": 6378137.0,
            "inverse_flattening": 298.257223563,
        },
    )
    dataset.attrs.update(
        {
            "Conventions": "CF-1.8",
            "title": f"{LAYER_TITLES[variable]} subset",
            "source": "Copernicus Marine GLOBAL_ANALYSISFORECAST_PHY_001_024",
        }
    )
    with TemporaryDirectory() as directory:
        path = Path(directory) / f"{variable}.nc"
        dataset.to_netcdf(path, engine="netcdf4")
        return path.read_bytes()


def exception_report(service: str, code: str, message: str, locator: str = "REQUEST") -> bytes:
    namespace = OWS if service == "WCS" else "http://www.opengis.net/ogc"
    root_name = "ExceptionReport" if service == "WCS" else "ServiceExceptionReport"
    root = ET.Element(f"{{{namespace}}}{root_name}", version=WCS_VERSION if service == "WCS" else WMS_VERSION)
    if service == "WCS":
        exception = _element(root, f"{{{namespace}}}Exception", exceptionCode=code, locator=locator)
        _element(exception, f"{{{namespace}}}ExceptionText", message)
    else:
        _element(root, f"{{{namespace}}}ServiceException", message, code=code, locator=locator)
    return _xml(root)