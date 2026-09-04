import os

import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.argo import router as argo_router
from backend.routers.instruments import router as instruments_router
from backend.routers.ogc import router as ogc_router
from backend.routers.ocean import router as ocean_router
from backend.routers.hazards import router as hazards_router

app = FastAPI(title="Ocean 3D Visualization API")

configured_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    *configured_origins,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(ocean_router)
app.include_router(argo_router)
app.include_router(instruments_router)
app.include_router(ogc_router)
app.include_router(hazards_router)


@app.get("/health")
def health() -> dict[str, str]:
    s3_bucket = os.getenv("AWS_S3_BUCKET", "")
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not service_role_key:
        return {"status": "ok", "supabase": "not_configured", "s3": "configured" if s3_bucket else "not_configured"}

    try:
        response = requests.get(
            f"{supabase_url}/rest/v1/datasets?select=id&limit=1",
            headers={"apikey": service_role_key, "Authorization": f"Bearer {service_role_key}"},
            timeout=5,
        )
        response.raise_for_status()
    except requests.RequestException:
        return {"status": "ok", "supabase": "unavailable", "s3": "configured" if s3_bucket else "not_configured"}
    return {"status": "ok", "supabase": "ok", "s3": "configured" if s3_bucket else "not_configured"}


@app.get("/api/health")
def api_health() -> dict[str, str]:
    return health()
