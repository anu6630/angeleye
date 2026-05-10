"""Unit tests for GroupPresenceService (Redis ZSET presence)."""

from unittest.mock import MagicMock, patch

import pytest
from redis.exceptions import RedisError

from app.services.group_presence_service import GroupPresenceService


class TestGroupPresenceService:
    @patch("app.services.group_presence_service.get_redis_client")
    def test_touch_runs_pipeline(self, mock_get_redis):
        mock_r = MagicMock()
        mock_pipe = MagicMock()
        mock_r.pipeline.return_value = mock_pipe
        mock_get_redis.return_value = mock_r

        GroupPresenceService().touch(group_id=7, user_id=42)

        mock_r.pipeline.assert_called_once()
        mock_pipe.zremrangebyscore.assert_called_once()
        mock_pipe.zadd.assert_called_once()
        zname = mock_pipe.zadd.call_args[0][0]
        assert zname == "group:presence:7"
        mapping = mock_pipe.zadd.call_args[0][1]
        assert mapping["42"] is not None
        mock_pipe.expire.assert_called_once()
        mock_pipe.execute.assert_called_once()

    @patch("app.services.group_presence_service.get_redis_client")
    def test_leave_runs_zrem(self, mock_get_redis):
        mock_r = MagicMock()
        mock_pipe = MagicMock()
        mock_r.pipeline.return_value = mock_pipe
        mock_get_redis.return_value = mock_r

        GroupPresenceService().leave(group_id=7, user_id=42)

        mock_pipe.zrem.assert_called_once()
        mock_pipe.execute.assert_called_once()

    @patch("app.services.group_presence_service.get_redis_client")
    def test_online_user_count_returns_zcard(self, mock_get_redis):
        mock_r = MagicMock()
        mock_pipe = MagicMock()
        mock_r.pipeline.return_value = mock_pipe
        mock_pipe.execute.return_value = [0, 5]
        mock_get_redis.return_value = mock_r

        n = GroupPresenceService().online_user_count(3)
        assert n == 5
        mock_pipe.zcard.assert_called_once()

    @patch("app.services.group_presence_service.get_redis_client")
    def test_touch_propagates_redis_error(self, mock_get_redis):
        mock_r = MagicMock()
        mock_pipe = MagicMock()
        mock_r.pipeline.return_value = mock_pipe
        mock_pipe.execute.side_effect = RedisError("down")
        mock_get_redis.return_value = mock_r

        with pytest.raises(RedisError):
            GroupPresenceService().touch(1, 1)
