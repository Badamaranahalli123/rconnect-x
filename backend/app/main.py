import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api import schools, meetings, ai, bugs
from app.api.referrals import router as referrals_router  # ✅ ADDED REFERRAL
from app.config.settings import get_settings
from app.database import init_db
from app.routes import api_router
from app.routes.files import router as files_router
from app.services.presence_service import run_inactivity_checker
from app.websocket.routes import router as ws_router
from app.utils.paths import UPLOAD_DIR

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # TEMP DATABASE DIAGNOSTIC
    from app.diagnostics.database_temp import startup_database_log_lines

    for line in startup_database_log_lines():
        logger.warning(line)
    # END TEMP DATABASE DIAGNOSTIC
    await init_db()
    from app.database import AsyncSessionLocal
    from app.services.push_notification_service import purge_stale_push_subscriptions

    async with AsyncSessionLocal() as session:
        purged = await purge_stale_push_subscriptions(session)
        await session.commit()
        if purged:
            logger.warning("Startup purged %s stale push subscription(s) after VAPID version check", purged)
    presence_task = asyncio.create_task(run_inactivity_checker())
    try:
        yield
    finally:
        presence_task.cancel()
        try:
            await presence_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title=settings.APP_NAME,
    description="RConnectX — futuristic startup networking platform API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

_dev_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_cors_origins = (
    list(dict.fromkeys([*settings.cors_origins_list, *_dev_origins]))
    if settings.DEBUG
    else settings.cors_origins_list
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?" if settings.DEBUG else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.include_router(files_router)

@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(_: Request, exc: SQLAlchemyError):
    logger.error(f"SQLAlchemy Error: {exc.__class__.__name__}", exc_info=exc)
    logger.error(f"Error details: {str(exc)}")
    detail = "Database error"
    if settings.DEBUG:
        detail = f"{exc.__class__.__name__}: {str(exc)}"
    return JSONResponse(status_code=503, content={"detail": detail, "error_type": "database_error"})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    logger.error(f"Unhandled Exception: {exc.__class__.__name__}", exc_info=exc)
    logger.error(f"Error details: {str(exc)}")
    detail = "Internal server error"
    if settings.DEBUG:
        detail = f"{exc.__class__.__name__}: {str(exc)}"
    return JSONResponse(status_code=500, content={"detail": detail, "error_type": "internal_error"})


# ============================================================
# 🔥 FIX: YOUR CUSTOM ROUTERS MUST BE REGISTERED FIRST! 🔥
# ============================================================

# ✅ YOUR CUSTOM ROUTERS (FIRST - highest priority)
app.include_router(schools.router, prefix=settings.API_PREFIX)
app.include_router(meetings.router, prefix=settings.API_PREFIX)
app.include_router(ai.router, prefix=settings.API_PREFIX)
app.include_router(bugs.router, prefix=settings.API_PREFIX)
app.include_router(referrals_router, prefix=settings.API_PREFIX)  # ✅ REFERRAL ROUTER ADDED

# ✅ THEN THE REST (AFTER - lower priority)
app.include_router(api_router, prefix=settings.API_PREFIX)
app.include_router(ws_router, prefix=settings.API_PREFIX)

# ============================================================

# TEMP DATABASE DIAGNOSTIC
from app.routes.debug_database_temp import router as debug_database_temp_router

app.include_router(debug_database_temp_router)
# END TEMP DATABASE DIAGNOSTIC


@app.get("/")
async def root():
    return {"name": settings.APP_NAME, "status": "ok", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
