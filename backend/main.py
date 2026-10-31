from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import models  # noqa: F401  (makes sure all tables are registered before create_all)
from config import FRONTEND_ORIGINS
from database import Base, engine
from routers import auth, calendar, groups, notices, saved, tags


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)   # creates tables if they don't exist yet
    yield


app = FastAPI(title="CampusConnect API", version="2.0", lifespan=lifespan)

# Cookie auth across localhost:5173 -> localhost:8000 needs credentials + explicit origins (no "*").
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    """The spec says validation failures are 400 (FastAPI's default is 422)."""
    errors = []
    for e in exc.errors():
        field = ".".join(str(p) for p in e["loc"] if p not in ("body", "query", "path"))
        msg = e["msg"].replace("Value error, ", "")
        errors.append({"field": field, "message": msg})
    detail = errors[0]["message"] if errors else "Invalid request"
    if errors and errors[0]["field"]:
        detail = f'{errors[0]["field"]}: {detail}'
    return JSONResponse(status_code=400, content={"detail": detail, "errors": errors})


app.include_router(auth.router)
app.include_router(tags.router)
app.include_router(groups.router)
app.include_router(notices.router)
app.include_router(notices.admin_router)
app.include_router(calendar.router)
app.include_router(saved.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}