"""Initial schema: users and profiles tables

Revision ID: 20260403_0400
Revises:
Create Date: 2026-04-03 04:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260403_0400'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('google_oauth_id', sa.String(length=255), nullable=True),
        sa.Column('facebook_oauth_id', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('facebook_oauth_id'),
        sa.UniqueConstraint('google_oauth_id'),
        sa.UniqueConstraint('username')
    )

    # Create indexes for users table
    op.create_index('ix_users_id', 'users', ['id'], unique=False)
    op.create_index('ix_users_email', 'users', ['email'], unique=False)
    op.create_index('ix_users_username', 'users', ['username'], unique=False)
    op.create_index('ix_users_google_oauth_id', 'users', ['google_oauth_id'], unique=False)
    op.create_index('ix_users_facebook_oauth_id', 'users', ['facebook_oauth_id'], unique=False)

    # Create case-insensitive indexes for email and username
    op.execute('CREATE INDEX ix_users_email_lower ON users (LOWER(email))')
    op.execute('CREATE INDEX ix_users_username_lower ON users (LOWER(username))')

    # Create profiles table
    op.create_table(
        'profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_profiles_user_id_users', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # Create indexes for profiles table
    op.create_index('ix_profiles_id', 'profiles', ['id'], unique=False)
    op.create_index('ix_profiles_user_id', 'profiles', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('ix_profiles_user_id', table_name='profiles')
    op.drop_index('ix_profiles_id', table_name='profiles')
    op.execute('DROP INDEX IF EXISTS ix_users_username_lower')
    op.execute('DROP INDEX IF EXISTS ix_users_email_lower')
    op.drop_index('ix_users_facebook_oauth_id', table_name='users')
    op.drop_index('ix_users_google_oauth_id', table_name='users')
    op.drop_index('ix_users_username', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_index('ix_users_id', table_name='users')

    # Drop tables
    op.drop_table('profiles')
    op.drop_table('users')
