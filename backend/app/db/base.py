"""
SQLAlchemy declarative base — import this in all model files.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
