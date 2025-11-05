from pydantic import BaseModel


class Token(BaseModel):
    """Schema for access token response."""

    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""

    sub: str | None = None
