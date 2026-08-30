from typing import Any

import requests

GDACS_EVENTS_URL = "https://www.gdacs.org/gdacsapi/api/Events/geteventlist/EVENTS4APP"


def _number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number else None


def _coordinates(value: Any) -> list[list[float]]:
    if isinstance(value, dict):
        value = value.get("coordinates")
    if not isinstance(value, list):
        return []
    if value and isinstance(value[0], (int, float)):
        return [[float(value[0]), float(value[1])]] if len(value) > 1 else []
    return [point for point in value if isinstance(point, list) and len(point) > 1]


def _normalise_event(feature: dict[str, Any]) -> dict[str, Any] | None:
    properties = feature.get("properties") or {}
    geometry = feature.get("geometry") or {}
    event_type = str(properties.get("eventtype") or properties.get("event_type") or properties.get("type") or "").upper()
    if event_type and event_type not in {"TC", "TROPICAL CYCLONE", "TROPICAL_CYCLONE"}:
        return None
    coordinates = _coordinates(geometry)
    if not coordinates:
        lon = _number(properties.get("longitude") or properties.get("lon"))
        lat = _number(properties.get("latitude") or properties.get("lat"))
        if lon is not None and lat is not None:
            coordinates = [[lon, lat]]
    if not coordinates:
        return None
    return {
        "id": str(feature.get("id") or properties.get("eventid") or properties.get("id") or "gdacs-cyclone"),
        "name": properties.get("name") or properties.get("eventname") or "Active tropical cyclone",
        "alert_level": properties.get("alertlevel") or properties.get("alert_level"),
        "last_update": properties.get("date") or properties.get("lastupdate") or properties.get("fromdate"),
        "coordinates": coordinates,
        "source": GDACS_EVENTS_URL,
    }


def fetch_cyclones() -> dict[str, Any]:
    response = requests.get(GDACS_EVENTS_URL, timeout=15)
    response.raise_for_status()
    payload = response.json()
    features = payload.get("features", []) if isinstance(payload, dict) else []
    if isinstance(payload, dict) and not features and isinstance(payload.get("events"), list):
        features = payload["events"]
    events = [event for feature in features if isinstance(feature, dict) and (event := _normalise_event(feature))]
    return {"events": events, "source": GDACS_EVENTS_URL, "status": "active" if events else "no_active_cyclones"}
