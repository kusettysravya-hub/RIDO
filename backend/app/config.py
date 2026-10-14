import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "CampusCommute Mobility & Fleet System")
    PORT: int = int(os.getenv("PORT", "8000"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./campus_commute.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "campuscommute-btech-secret-key-super-safe-academic-demo")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    CAMPUS_NAME: str = os.getenv("CAMPUS_NAME", "Apex University Tech Campus")
    CAMPUS_LAT: float = float(os.getenv("CAMPUS_LAT", "37.7749"))
    CAMPUS_LNG: float = float(os.getenv("CAMPUS_LNG", "-122.4194"))
    SIMULATION_MODE: bool = os.getenv("SIMULATION_MODE", "True").lower() in ("true", "1")

settings = Settings()
