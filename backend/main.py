import os

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
    return {"status": "ok"}


@app.get("/api/health")
def api_health() -> dict[str, str]:
    return health()
