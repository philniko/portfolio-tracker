"""Add Questrade forex rate to portfolio

Revision ID: 6d7ff797b4e6
Revises: 5c6ee686a3d5
Create Date: 2025-11-08 11:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6d7ff797b4e6'
down_revision = '5c6ee686a3d5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add forex rate column to portfolios table
    op.add_column('portfolios', sa.Column('questrade_forex_rate', sa.Numeric(precision=10, scale=6), nullable=True))


def downgrade() -> None:
    # Remove forex rate column
    op.drop_column('portfolios', 'questrade_forex_rate')
