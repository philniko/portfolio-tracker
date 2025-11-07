"""add questrade sync fields to portfolio

Revision ID: 3a4cc494e1b3
Revises: 38fad7562c5e
Create Date: 2025-11-06 21:27:46.144214

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3a4cc494e1b3'
down_revision = '38fad7562c5e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add questrade_account_id column to portfolios table
    op.add_column('portfolios', sa.Column('questrade_account_id', sa.String(), nullable=True))
    op.add_column('portfolios', sa.Column('last_questrade_sync', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove questrade sync columns
    op.drop_column('portfolios', 'last_questrade_sync')
    op.drop_column('portfolios', 'questrade_account_id')
