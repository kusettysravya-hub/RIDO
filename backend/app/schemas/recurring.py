from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class RecurringRideCreate(BaseModel):
    title: str = "Campus Morning Commute"
    origin_name: str
    origin_lat: float
    origin_lng: float
    destination_name: str
    destination_lat: float
    destination_lng: float
    departure_time: str = "08:30"
    frequency: str = "WEEKDAYS" # DAILY, WEEKDAYS, WEEKLY
    days_of_week: str = "Mon,Tue,Wed,Thu,Fri"
    seats_needed: int = 1

class RecurringRideResponse(BaseModel):
    id: str
    user_id: str
    title: str
    origin_name: str
    destination_name: str
    departure_time: str
    frequency: str
    days_of_week: str
    seats_needed: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
