"""Add cash balance to portfolio

Revision ID: 5c6ee686a3d5
Revises: 4b5dd595f2c4
Create Date: 2025-11-08 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5c6ee686a3d5'
down_revision = '4b5dd595f2c4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add cash balance columns to portfolios table
    op.add_column('portfolios', sa.Column('cash_balance_cad', sa.Numeric(precision=18, scale=2), nullable=False, server_default='0'))
    op.add_column('portfolios', sa.Column('cash_balance_usd', sa.Numeric(precision=18, scale=2), nullable=False, server_default='0'))


def downgrade() -> None:
    # Remove cash balance columns
    op.drop_column('portfolios', 'cash_balance_usd')
    op.drop_column('portfolios', 'cash_balance_cad')
