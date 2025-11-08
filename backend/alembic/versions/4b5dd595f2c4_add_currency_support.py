"""Add currency support to transactions and holdings

Revision ID: 4b5dd595f2c4
Revises: 3a4cc494e1b3
Create Date: 2025-11-08 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4b5dd595f2c4'
down_revision = '3a4cc494e1b3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create currency enum type
    currency_enum = sa.Enum('CAD', 'USD', name='currency')
    currency_enum.create(op.get_bind(), checkfirst=True)

    # Add currency column to transactions table (default CAD for existing rows)
    op.add_column('transactions', sa.Column('currency', currency_enum, nullable=False, server_default='CAD'))

    # Add currency column to holdings table (default CAD for existing rows)
    op.add_column('holdings', sa.Column('currency', currency_enum, nullable=False, server_default='CAD'))


def downgrade() -> None:
    # Remove currency columns
    op.drop_column('holdings', 'currency')
    op.drop_column('transactions', 'currency')

    # Drop enum type
    currency_enum = sa.Enum('CAD', 'USD', name='currency')
    currency_enum.drop(op.get_bind(), checkfirst=True)
