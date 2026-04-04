"""add fork and follow tables

Revision ID: 005
Revises: 004
Create Date: 2026-04-05 10:05:00.000000

Adds:
- Fork lineage fields to notebooks (parent_id, root_id, is_archived)
- Fork lineage fields to datasets (parent_id, root_id)
- Follows table for user social graph
- FeedEvents table for engagement tracking (ML foundation)

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add fork lineage columns to notebooks table
    op.add_column('notebooks', sa.Column('parent_id', sa.Integer(), nullable=True))
    op.add_column('notebooks', sa.Column('root_id', sa.Integer(), nullable=True))
    op.add_column('notebooks', sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'))

    # Add indexes for notebook fork lineage
    op.create_index('ix_notebooks_parent_id', 'notebooks', ['parent_id'], unique=False)
    op.create_index('ix_notebooks_root_id', 'notebooks', ['root_id'], unique=False)
    op.create_index('ix_notebooks_is_archived', 'notebooks', ['is_archived'], unique=False)

    # Add foreign keys for notebook fork lineage (self-referential)
    op.create_foreign_key(
        'fk_notebooks_parent_id_notebooks',
        'notebooks', 'notebooks',
        ['parent_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_notebooks_root_id_notebooks',
        'notebooks', 'notebooks',
        ['root_id'], ['id'],
        ondelete='SET NULL'
    )

    # Add fork lineage columns to datasets table
    op.add_column('datasets', sa.Column('parent_id', sa.Integer(), nullable=True))
    op.add_column('datasets', sa.Column('root_id', sa.Integer(), nullable=True))

    # Add indexes for dataset fork lineage
    op.create_index('ix_datasets_parent_id', 'datasets', ['parent_id'], unique=False)
    op.create_index('ix_datasets_root_id', 'datasets', ['root_id'], unique=False)

    # Add foreign keys for dataset fork lineage (self-referential)
    op.create_foreign_key(
        'fk_datasets_parent_id_datasets',
        'datasets', 'datasets',
        ['parent_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_datasets_root_id_datasets',
        'datasets', 'datasets',
        ['root_id'], ['id'],
        ondelete='SET NULL'
    )

    # Create follows table
    op.create_table(
        'follows',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('follower_id', sa.Integer(), nullable=False),
        sa.Column('following_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['follower_id'], ['users.id'], name='fk_follows_follower_id_users', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['following_id'], ['users.id'], name='fk_follows_following_id_users', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('follower_id', 'following_id', name='uq_follow')
    )

    # Create indexes for follows table
    op.create_index('ix_follows_id', 'follows', ['id'], unique=False)
    op.create_index('ix_follows_follower_id', 'follows', ['follower_id'], unique=False)
    op.create_index('ix_follows_following_id', 'follows', ['following_id'], unique=False)

    # Create feed_events table
    op.create_table(
        'feed_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('notebook_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('bucket_id', sa.String(length=100), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_feed_events_user_id_users', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['notebook_id'], ['notebooks.id'], name='fk_feed_events_notebook_id_notebooks', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for feed_events table
    op.create_index('ix_feed_events_id', 'feed_events', ['id'], unique=False)
    op.create_index('ix_feed_events_user_id', 'feed_events', ['user_id'], unique=False)
    op.create_index('ix_feed_events_notebook_id', 'feed_events', ['notebook_id'], unique=False)
    op.create_index('ix_feed_events_event_type', 'feed_events', ['event_type'], unique=False)
    op.create_index('ix_feed_events_bucket_id', 'feed_events', ['bucket_id'], unique=False)
    op.create_index('ix_feed_events_timestamp', 'feed_events', ['timestamp'], unique=False)
    op.create_index('ix_feed_events_user_timestamp', 'feed_events', ['user_id', 'timestamp'], unique=False)
    op.create_index('ix_feed_events_notebook_type', 'feed_events', ['notebook_id', 'event_type'], unique=False)


def downgrade() -> None:
    # Drop feed_events table
    op.drop_index('ix_feed_events_notebook_type', table_name='feed_events')
    op.drop_index('ix_feed_events_user_timestamp', table_name='feed_events')
    op.drop_index('ix_feed_events_timestamp', table_name='feed_events')
    op.drop_index('ix_feed_events_bucket_id', table_name='feed_events')
    op.drop_index('ix_feed_events_event_type', table_name='feed_events')
    op.drop_index('ix_feed_events_notebook_id', table_name='feed_events')
    op.drop_index('ix_feed_events_user_id', table_name='feed_events')
    op.drop_index('ix_feed_events_id', table_name='feed_events')
    op.drop_table('feed_events')

    # Drop follows table
    op.drop_index('ix_follows_following_id', table_name='follows')
    op.drop_index('ix_follows_follower_id', table_name='follows')
    op.drop_index('ix_follows_id', table_name='follows')
    op.drop_table('follows')

    # Drop dataset fork lineage foreign keys and columns
    op.drop_constraint('fk_datasets_root_id_datasets', 'datasets', type_='foreignkey')
    op.drop_constraint('fk_datasets_parent_id_datasets', 'datasets', type_='foreignkey')
    op.drop_index('ix_datasets_root_id', table_name='datasets')
    op.drop_index('ix_datasets_parent_id', table_name='datasets')
    op.drop_column('datasets', 'root_id')
    op.drop_column('datasets', 'parent_id')

    # Drop notebook fork lineage foreign keys and columns
    op.drop_constraint('fk_notebooks_root_id_notebooks', 'notebooks', type_='foreignkey')
    op.drop_constraint('fk_notebooks_parent_id_notebooks', 'notebooks', type_='foreignkey')
    op.drop_index('ix_notebooks_is_archived', table_name='notebooks')
    op.drop_index('ix_notebooks_root_id', table_name='notebooks')
    op.drop_index('ix_notebooks_parent_id', table_name='notebooks')
    op.drop_column('notebooks', 'is_archived')
    op.drop_column('notebooks', 'root_id')
    op.drop_column('notebooks', 'parent_id')
