from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base


class QuestradeConnection(Base):
    """Model for storing Questrade API connection details."""

    __tablename__ = "questrade_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # OAuth tokens (should be encrypted in production)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    api_server = Column(String(255), nullable=False)

    # Token expiration
    token_expires_at = Column(DateTime, nullable=False)

    # Questrade account IDs
    account_ids = Column(JSON, default=list)

    # Sync tracking
    last_sync_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="questrade_connection")
