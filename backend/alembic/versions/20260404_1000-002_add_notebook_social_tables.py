"""Add notebook social tables: notebooks, notebook_cells, likes, comments

Revision ID: 002
Revises: 001
Create Date: 2026-04-04 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create notebooks table
    op.create_table(
        'notebooks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('is_published', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_notebooks_user_id_users', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for notebooks table
    op.create_index('ix_notebooks_id', 'notebooks', ['id'], unique=False)
    op.create_index('ix_notebooks_user_id', 'notebooks', ['user_id'], unique=False)
    op.create_index('ix_notebooks_is_published', 'notebooks', ['is_published'], unique=False)
    op.create_index('ix_notebooks_created_at', 'notebooks', ['created_at'], unique=False)

    # Create notebook_cells table
    op.create_table(
        'notebook_cells',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('notebook_id', sa.Integer(), nullable=False),
        sa.Column('cell_type', sa.String(length=50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['notebook_id'], ['notebooks.id'], name='fk_notebook_cells_notebook_id_notebooks', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for notebook_cells table
    op.create_index('ix_notebook_cells_id', 'notebook_cells', ['id'], unique=False)
    op.create_index('ix_notebook_cells_notebook_id', 'notebook_cells', ['notebook_id'], unique=False)

    # Create likes table
    op.create_table(
        'likes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('notebook_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_likes_user_id_users', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['notebook_id'], ['notebooks.id'], name='fk_likes_notebook_id_notebooks', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'notebook_id', name='uq_user_notebook_like')
    )

    # Create indexes for likes table
    op.create_index('ix_likes_id', 'likes', ['id'], unique=False)
    op.create_index('ix_likes_user_id', 'likes', ['user_id'], unique=False)
    op.create_index('ix_likes_notebook_id', 'likes', ['notebook_id'], unique=False)

    # Create comments table
    op.create_table(
        'comments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('notebook_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['notebook_id'], ['notebooks.id'], name='fk_comments_notebook_id_notebooks', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_comments_user_id_users', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_id'], ['comments.id'], name='fk_comments_parent_id_comments', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for comments table
    op.create_index('ix_comments_id', 'comments', ['id'], unique=False)
    op.create_index('ix_comments_notebook_id', 'comments', ['notebook_id'], unique=False)
    op.create_index('ix_comments_user_id', 'comments', ['user_id'], unique=False)
    op.create_index('ix_comments_parent_id', 'comments', ['parent_id'], unique=False)
    op.create_index('ix_comments_created_at', 'comments', ['created_at'], unique=False)


def downgrade() -> None:
    # Drop indexes first (in reverse order of creation)
    op.drop_index('ix_comments_created_at', table_name='comments')
    op.drop_index('ix_comments_parent_id', table_name='comments')
    op.drop_index('ix_comments_user_id', table_name='comments')
    op.drop_index('ix_comments_notebook_id', table_name='comments')
    op.drop_index('ix_comments_id', table_name='comments')

    op.drop_index('ix_likes_notebook_id', table_name='likes')
    op.drop_index('ix_likes_user_id', table_name='likes')
    op.drop_index('ix_likes_id', table_name='likes')

    op.drop_index('ix_notebook_cells_notebook_id', table_name='notebook_cells')
    op.drop_index('ix_notebook_cells_id', table_name='notebook_cells')

    op.drop_index('ix_notebooks_created_at', table_name='notebooks')
    op.drop_index('ix_notebooks_is_published', table_name='notebooks')
    op.drop_index('ix_notebooks_user_id', table_name='notebooks')
    op.drop_index('ix_notebooks_id', table_name='notebooks')

    # Drop tables (in reverse order of creation)
    op.drop_table('comments')
    op.drop_table('likes')
    op.drop_table('notebook_cells')
    op.drop_table('notebooks')
