from fastapi import HTTPException, status


class PortfolioTrackerException(Exception):
    """Base exception for Portfolio Tracker application."""

    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class NotFoundException(PortfolioTrackerException):
    """Exception raised when a resource is not found."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status.HTTP_404_NOT_FOUND)


class UnauthorizedException(PortfolioTrackerException):
    """Exception raised for authentication failures."""

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(PortfolioTrackerException):
    """Exception raised when user doesn't have permission."""

    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status.HTTP_403_FORBIDDEN)


class BadRequestException(PortfolioTrackerException):
    """Exception raised for bad requests."""

    def __init__(self, message: str = "Bad request"):
        super().__init__(message, status.HTTP_400_BAD_REQUEST)


class StockDataException(PortfolioTrackerException):
    """Exception raised when stock data fetch fails."""

    def __init__(self, message: str = "Failed to fetch stock data"):
        super().__init__(message, status.HTTP_503_SERVICE_UNAVAILABLE)
