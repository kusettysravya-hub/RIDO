from .auth import router as auth_router
from .rides import router as rides_router
from .passengers import router as passengers_router
from .drivers import router as drivers_router
from .fleet import router as fleet_router
from .safety import router as safety_router
from .analytics import router as analytics_router
from .recovery import router as recovery_router

__all__ = [
    "auth_router",
    "rides_router",
    "passengers_router",
    "drivers_router",
    "fleet_router",
    "safety_router",
    "analytics_router",
    "recovery_router",
]
