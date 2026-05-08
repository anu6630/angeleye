"""add_dataset_id_to_notebooks

Revision ID: 20260502_0001
Revises: b69f20a5be61
Create Date: 2026-05-02 00:01:00.000000+00:00

Adds dataset_id FK to notebooks table so we can persist which dataset was
used for the last server compilation (for display, re-publish, and forking).
"""
from alembic import op
import sqlalchemy as sa

revision = '20260502_0001'
down_revision = 'b69f20a5be61'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'notebooks',
        sa.Column('dataset_id', sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        'fk_notebooks_dataset_id',
        'notebooks', 'datasets',
        ['dataset_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_notebooks_dataset_id', 'notebooks', ['dataset_id'])


def downgrade() -> None:
    op.drop_index('ix_notebooks_dataset_id', table_name='notebooks')
    op.drop_constraint('fk_notebooks_dataset_id', 'notebooks', type_='foreignkey')
    op.drop_column('notebooks', 'dataset_id')
