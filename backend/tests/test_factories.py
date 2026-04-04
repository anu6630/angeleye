"""
Factory functions for creating test data.

Factory pattern per D-03: Flexible test data generation with optional kwargs.
All factories commit to database, refresh, and return model instances.
"""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.notebook import Notebook
from app.models.notebook_cell import NotebookCell
from app.models.like import Like
from app.models.comment import Comment
from app.models.follow import Follow


def create_user(
    db_session: Session,
    username: Optional[str] = None,
    email: Optional[str] = None,
    google_oauth_id: Optional[str] = None,
    facebook_oauth_id: Optional[str] = None,
    **kwargs
) -> User:
    """
    Create a test user in the database.

    Args:
        db_session: Database session
        username: Username (auto-generated if None)
        email: Email (auto-generated if None)
        google_oauth_id: Google OAuth ID (auto-generated if None)
        facebook_oauth_id: Facebook OAuth ID (auto-generated if None)
        **kwargs: Additional fields to override

    Returns:
        User instance
    """
    import random

    if username is None:
        username = f"testuser_{random.randint(1000, 9999)}"
    if email is None:
        email = f"{username}@example.com"
    if google_oauth_id is None and facebook_oauth_id is None:
        # Default to Google OAuth
        google_oauth_id = f"test-google-{random.randint(10000, 99999)}"

    user = User(
        username=username,
        email=email,
        google_oauth_id=google_oauth_id,
        facebook_oauth_id=facebook_oauth_id,
        **kwargs
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    return user


def create_notebook(
    db_session: Session,
    user_id: int,
    title: str = "Test Notebook",
    is_published: bool = False,
    **kwargs
) -> Notebook:
    """
    Create a test notebook in the database.

    Args:
        db_session: Database session
        user_id: Owner user ID
        title: Notebook title
        is_published: Whether notebook is published
        **kwargs: Additional fields to override

    Returns:
        Notebook instance
    """
    notebook = Notebook(
        user_id=user_id,
        title=title,
        is_published=is_published,
        **kwargs
    )
    db_session.add(notebook)
    db_session.commit()
    db_session.refresh(notebook)

    return notebook


def create_notebook_cell(
    db_session: Session,
    notebook_id: int,
    cell_type: str = "code",
    content: str = 'print("Hello, World!")',
    order_index: int = 0,
    **kwargs
) -> NotebookCell:
    """
    Create a test notebook cell in the database.

    Args:
        db_session: Database session
        notebook_id: Parent notebook ID
        cell_type: Cell type ('code' or 'markdown')
        content: Cell content
        order_index: Cell order in notebook
        **kwargs: Additional fields to override

    Returns:
        NotebookCell instance
    """
    cell = NotebookCell(
        notebook_id=notebook_id,
        cell_type=cell_type,
        content=content,
        order_index=order_index,
        **kwargs
    )
    db_session.add(cell)
    db_session.commit()
    db_session.refresh(cell)

    return cell


def create_like(
    db_session: Session,
    user_id: int,
    notebook_id: int,
    **kwargs
) -> Like:
    """
    Create a test like in the database.

    Args:
        db_session: Database session
        user_id: User ID who liked
        notebook_id: Notebook ID that was liked
        **kwargs: Additional fields to override

    Returns:
        Like instance
    """
    like = Like(
        user_id=user_id,
        notebook_id=notebook_id,
        **kwargs
    )
    db_session.add(like)
    db_session.commit()
    db_session.refresh(like)

    return like


def create_comment(
    db_session: Session,
    user_id: int,
    notebook_id: int,
    content: str = "Test comment",
    parent_id: Optional[int] = None,
    **kwargs
) -> Comment:
    """
    Create a test comment in the database.

    Args:
        db_session: Database session
        user_id: Commenter user ID
        notebook_id: Notebook ID being commented on
        content: Comment content
        parent_id: Parent comment ID for threaded replies
        **kwargs: Additional fields to override

    Returns:
        Comment instance
    """
    comment = Comment(
        user_id=user_id,
        notebook_id=notebook_id,
        content=content,
        parent_id=parent_id,
        **kwargs
    )
    db_session.add(comment)
    db_session.commit()
    db_session.refresh(comment)

    return comment


def create_fork(
    db_session: Session,
    notebook_id: int,
    user_id: int,
    title: Optional[str] = None,
    **kwargs
) -> Notebook:
    """
    Create a test fork (notebook with parent_id and root_id).

    Args:
        db_session: Database session
        notebook_id: Parent notebook ID to fork from
        user_id: User ID creating the fork
        title: Fork title (auto-generated if None)
        **kwargs: Additional fields to override

    Returns:
        Notebook instance (the fork)
    """
    # Get parent notebook to determine root_id
    parent = db_session.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not parent:
        raise ValueError(f"Parent notebook {notebook_id} not found")

    # If parent is a fork, use its root_id; otherwise use parent's id
    root_id = parent.root_id if parent.root_id else parent.id

    if title is None:
        title = f"Fork of {parent.title}"

    fork = Notebook(
        user_id=user_id,
        title=title,
        description=parent.description,
        is_published=False,
        parent_id=notebook_id,
        root_id=root_id,
        **kwargs
    )
    db_session.add(fork)
    db_session.commit()
    db_session.refresh(fork)

    return fork


def create_follow(
    db_session: Session,
    follower_id: int,
    following_id: int,
    **kwargs
) -> Follow:
    """
    Create a test follow relationship in the database.

    Args:
        db_session: Database session
        follower_id: User ID who is following
        following_id: User ID being followed
        **kwargs: Additional fields to override

    Returns:
        Follow instance
    """
    follow = Follow(
        follower_id=follower_id,
        following_id=following_id,
        **kwargs
    )
    db_session.add(follow)
    db_session.commit()
    db_session.refresh(follow)

    return follow


def create_published_notebook_with_cells(
    db_session: Session,
    user_id: int,
    title: str = "Published Test Notebook",
    days_ago: int = 1,
    **kwargs
) -> Notebook:
    """
    Create a published notebook with cells for testing feeds and trending.

    Args:
        db_session: Database session
        user_id: Owner user ID
        title: Notebook title
        days_ago: Days ago to set created_at (for time-decay testing)
        **kwargs: Additional fields to override

    Returns:
        Notebook instance with cells
    """
    created_at = datetime.utcnow() - timedelta(days=days_ago)

    notebook = create_notebook(
        db_session,
        user_id=user_id,
        title=title,
        is_published=True,
        **kwargs
    )
    notebook.created_at = created_at
    db_session.commit()

    # Add some cells
    create_notebook_cell(
        db_session,
        notebook_id=notebook.id,
        cell_type="code",
        content='print("Hello from test notebook!")',
        order_index=0
    )
    create_notebook_cell(
        db_session,
        notebook_id=notebook.id,
        cell_type="markdown",
        content="# Test Heading\n\nThis is a test notebook.",
        order_index=1
    )

    db_session.refresh(notebook)
    return notebook
