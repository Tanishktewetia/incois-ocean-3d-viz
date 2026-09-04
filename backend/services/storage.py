from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import requests


class StorageDataUnavailableError(RuntimeError):
    """Raised when a configured Supabase Storage object cannot be cached."""


def _configuration() -> tuple[str, str, str] | None:
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "ocean-data")
    return (url, key, bucket) if url and key and bucket else None


def _headers(key: str) -> dict[str, str]:
    return {"apikey": key, "Authorization": f"Bearer {key}"}


def _object_candidates(relative_path: str) -> tuple[str, ...]:
    normalized = relative_path.replace("\\", "/").lstrip("/")
    return normalized, f"data/{normalized}"


def _find_object(relative_path: str, url: str, key: str, bucket: str) -> str | None:
    endpoint = f"{url}/storage/v1/object/list/{bucket}"
    for candidate in _object_candidates(relative_path):
        response = requests.post(
            endpoint,
            headers={**_headers(key), "Content-Type": "application/json"},
            json={"prefix": candidate, "limit": 10},
            timeout=15,
        )
        response.raise_for_status()
        objects = response.json()
        if any(item.get("name") == Path(candidate).name for item in objects if isinstance(item, dict)):
            parent = str(Path(candidate).parent).replace("\\", "/")
            return f"{parent}/{Path(candidate).name}" if parent != "." else Path(candidate).name
    return None


def ensure_storage_file(path: Path) -> bool:
    """Download one missing backend/data file from private Supabase Storage."""
    if path.is_file():
        return True
    configuration = _configuration()
    if configuration is None:
        return False

    url, key, bucket = configuration
    relative_path = path.relative_to(Path(__file__).resolve().parents[1] / "data")
    try:
        object_path = _find_object(str(relative_path), url, key, bucket)
        if object_path is None:
            return False
        response = requests.get(
            f"{url}/storage/v1/object/{bucket}/{object_path}",
            headers=_headers(key),
            stream=True,
            timeout=(15, 300),
        )
        response.raise_for_status()
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = path.with_suffix(path.suffix + ".part")
        with temporary_path.open("wb") as destination:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    destination.write(chunk)
        temporary_path.replace(path)
        return True
    except (OSError, requests.RequestException, ValueError):
        path.with_suffix(path.suffix + ".part").unlink(missing_ok=True)
        return False


def ensure_storage_directory(directory: Path) -> int:
    """Download missing files below one backend/data directory from Storage."""
    if directory.is_dir() and any(directory.iterdir()):
        existing = list(directory.glob("*.nc"))
        if existing:
            return len(existing)
    configuration = _configuration()
    if configuration is None:
        return 0

    url, key, bucket = configuration
    data_root = Path(__file__).resolve().parents[1] / "data"
    relative_directory = directory.relative_to(data_root).as_posix().rstrip("/")
    try:
        response = requests.post(
            f"{url}/storage/v1/object/list/{bucket}",
            headers={**_headers(key), "Content-Type": "application/json"},
            json={"prefix": relative_directory, "limit": 100},
            timeout=15,
        )
        response.raise_for_status()
        objects: list[dict[str, Any]] = response.json()
        downloaded = 0
        for item in objects:
            name = item.get("name")
            if not isinstance(name, str) or not name.endswith(".nc"):
                continue
            target = directory / Path(name).name
            if ensure_storage_file(target):
                downloaded += 1
        return downloaded
    except (OSError, requests.RequestException, ValueError):
        return 0