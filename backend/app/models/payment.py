import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ride_id = Column(String(36), ForeignKey("rides.id"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(30), default="CAMPUS_WALLET") # CAMPUS_WALLET, SIMULATED_CARD, UPI_DEMO
    payment_type = Column(String(30), default="RIDE_FARE") # RIDE_FARE, DRIVER_PAYOUT, WALLET_TOPUP, PLATFORM_SHARE
    status = Column(String(20), default="COMPLETED") # COMPLETED, REFUNDED, PENDING
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="payments")
    ride = relationship("Ride", back_populates="payments")

class Rating(Base):
    __tablename__ = "ratings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ride_id = Column(String(36), ForeignKey("rides.id"), nullable=False)
    rater_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    rated_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    rating_score = Column(Integer, nullable=False) # 1 to 5
    feedback = Column(Text, nullable=True)
    tags = Column(String(200), nullable=True) # e.g. "Safe Driving,Punctual,Clean Vehicle"
    created_at = Column(DateTime, default=datetime.utcnow)

    ride = relationship("Ride", back_populates="ratings")
    rater = relationship("User", foreign_keys=[rater_user_id])
    rated = relationship("User", foreign_keys=[rated_user_id])

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(30), default="RIDE_UPDATE") # RIDE_UPDATE, MATCH_FOUND, RECURRING_ALERT, SAFETY_ALERT, SYSTEM
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")
