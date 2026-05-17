"""Unit tests for NotebookPresenceService (Redis ZSET presence)."""

from unittest.mock import MagicMock, patch

import pytest
from redis.exceptions import RedisError

from app.services.notebook_presence_service import NotebookPresenceService


class TestNotebookPresenceService:
    @patch("app.services.notebook_presence_service.get_redis_client")
    def test_touch_runs_pipeline(self, mock_get_redis):
        mock_r = MagicMock()
        mock_pipe = MagicMock()
        mock_r.pipeline.return_value = mock_pipe
        mock_get_redis.return_value = mock_r

        NotebookPresenceService().touch(notebook_id=7, member_key="u:42")

        mock_r.pipeline.assert_called_once()
        mock_pipe.zremrangebyscore.assert_called_once()
        mock_pipe.zadd.assert_called_once()
        zname = mock_pipe.zadd.call_args[0][0]
        assert zname == "notebook:presence:7"
        mapping = mock_pipe.zadd.call_args[0][1]
        assert mapping["u:42"] is not None
        mock_pipe.expire.assert_called_once()
        mock_pipe.execute.assert_called_once()

    @patch("app.services.notebook_presence_service.get_redis_client")
    def test_leave_runs_zrem(self, mock_get_redis):
        mock_r = MagicMock()
        mock_pipe = MagicMock()
        mock_r.pipeline.return_value = mock_pipe
        mock_get_redis.return_value = mock_r

        NotebookPresenceService().leave(notebook_id=7, member_key="a:00000000-0000-4000-8000-000000000001")

        mock_pipe.zrem.assert_called_once()
        mock_pipe.execute.assert_called_once()

    @patch("app.services.notebook_presence_service.get_redis_client")
    def test_online_viewer_count_returns_zcard(self, mock_get_redis):
        mock_r = MagicMock()
        mock_pipe = MagicMock()
        mock_r.pipeline.return_value = mock_pipe
        mock_pipe.execute.return_value = [0, 5]
        mock_get_redis.return_value = mock_r

        n = NotebookPresenceService().online_viewer_count(3)
        assert n == 5
        mock_pipe.zcard.assert_called_once()

    @patch("app.services.notebook_presence_service.get_redis_client")
    def test_touch_propagates_redis_error(self, mock_get_redis):
        mock_r = MagicMock()
        mock_pipe = MagicMock()
        mock_r.pipeline.return_value = mock_pipe
        mock_pipe.execute.side_effect = RedisError("down")
        mock_get_redis.return_value = mock_r

        with pytest.raises(RedisError):
            NotebookPresenceService().touch(1, "u:1")
