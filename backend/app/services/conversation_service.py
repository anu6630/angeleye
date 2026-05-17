from dataclasses import dataclass
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.conversation import Conversation, ConversationParticipant, Message, MessageReaction
from app.models.user import User
from app.services.friend_service import FriendService
from app.services import chat_realtime
from app.services.avatar_service import build_avatar_url


def validate_emoji_key(emoji: str) -> str:
    e = emoji.strip()
    if not e or len(e) > 32:
        raise ValueError("Invalid emoji")
    if any(c in e for c in "\n\r\t\x00"):
        raise ValueError("Invalid emoji")
    return e


@dataclass
class MessagePage:
    items: List[Message]
    next_cursor: Optional[int]


class ConversationService:
    TYPE_DIRECT = "direct"

    def __init__(self, db: Session):
        self.db = db
        self.friends = FriendService(db)

    def _other_participant_id(self, conv: Conversation, user_id: int) -> Optional[int]:
        for p in conv.participants:
            if p.user_id != user_id:
                return p.user_id
        return None

    def get_conversation(self, conversation_id: int) -> Optional[Conversation]:
        return self.db.query(Conversation).filter(Conversation.id == conversation_id).first()

    def assert_friend_participant(self, conversation_id: int, user_id: int) -> Conversation:
        conv = self.get_conversation(conversation_id)
        if not conv:
            raise ValueError("Conversation not found")
        part = (
            self.db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id,
            )
            .first()
        )
        if not part:
            raise ValueError("Not a participant")
        other = self._other_participant_id(conv, user_id)
        if other is None or not self.friends.are_friends(user_id, other):
            raise ValueError("Messaging is only available between friends")
        return conv

    def get_or_create_direct(self, user_id: int, other_user_id: int) -> Conversation:
        if user_id == other_user_id:
            raise ValueError("Invalid conversation")
        if not self.friends.are_friends(user_id, other_user_id):
            raise ValueError("You can only message friends")

        low, high = (user_id, other_user_id) if user_id < other_user_id else (other_user_id, user_id)
        conv = (
            self.db.query(Conversation)
            .filter(
                Conversation.type == self.TYPE_DIRECT,
                Conversation.direct_user_low_id == low,
                Conversation.direct_user_high_id == high,
            )
            .first()
        )
        if conv:
            return conv

        conv = Conversation(
            type=self.TYPE_DIRECT,
            direct_user_low_id=low,
            direct_user_high_id=high,
        )
        self.db.add(conv)
        self.db.flush()
        self.db.add(ConversationParticipant(conversation_id=conv.id, user_id=low))
        self.db.add(ConversationParticipant(conversation_id=conv.id, user_id=high))
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def list_conversations(self, user_id: int) -> List[Tuple[Conversation, Optional[Message], User]]:
        """Return (conversation, last_message, other_user) for each thread."""
        # 1. Get all conversation IDs the user is a participant of
        participant_conv_ids = [
            r[0] for r in self.db.query(ConversationParticipant.conversation_id)
            .filter(ConversationParticipant.user_id == user_id)
            .all()
        ]
        
        if not participant_conv_ids:
            return []

        # 2. For each conversation, find the OTHER participant
        # (Assuming direct chats for now, where there is exactly one other participant)
        other_participants = (
            self.db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id.in_(participant_conv_ids),
                ConversationParticipant.user_id != user_id
            )
            .all()
        )
        
        results = []
        for p in other_participants:
            conv = p.conversation
            other_user = p.user
            
            # 3. Get the latest message for this conversation
            last_message = (
                self.db.query(Message)
                .filter(Message.conversation_id == conv.id)
                .order_by(desc(Message.id))
                .first()
            )
            
            results.append((conv, last_message, other_user))
            
        # 4. Sort by the ID of the last message (most recent first)
        results.sort(key=lambda x: x[1].id if x[1] else 0, reverse=True)
        return results

    def list_messages(
        self, conversation_id: int, user_id: int, cursor: Optional[int], limit: int = 40
    ) -> MessagePage:
        self.assert_friend_participant(conversation_id, user_id)
        q = (
            self.db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(desc(Message.id))
        )
        if cursor is not None:
            q = q.filter(Message.id < cursor)
        rows = q.limit(limit + 1).all()
        has_more = len(rows) > limit
        items = rows[:limit]
        next_c = items[-1].id if has_more and items else None
        return MessagePage(items=items, next_cursor=next_c)

    def create_message(
        self,
        conversation_id: int,
        sender_id: int,
        body: Optional[str],
        quoted_message_id: Optional[int],
        attachment_key: Optional[str],
        attachment_mime: Optional[str],
        attachment_size: Optional[int],
        attachment_filename: Optional[str],
    ) -> Message:
        conv = self.assert_friend_participant(conversation_id, sender_id)
        text = (body or "").strip()
        has_attach = bool(attachment_key)
        if not text and not has_attach:
            raise ValueError("Message must have text or an attachment")
        if quoted_message_id is not None:
            qm = (
                self.db.query(Message)
                .filter(
                    Message.id == quoted_message_id,
                    Message.conversation_id == conversation_id,
                )
                .first()
            )
            if not qm:
                raise ValueError("Quoted message not in this conversation")

        msg = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            body=text or None,
            quoted_message_id=quoted_message_id,
            attachment_key=attachment_key,
            attachment_mime=attachment_mime,
            attachment_size=attachment_size,
            attachment_filename=attachment_filename,
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)

        participant_ids = [p.user_id for p in conv.participants]
        payload = {
            "type": "message", 
            "conversation_id": conversation_id, 
            "message_id": msg.id,
            "sender_id": sender_id,
            "sender_username": msg.sender.username,
            "sender_avatar": build_avatar_url(msg.sender.username, msg.sender.profile),
            "body": msg.body,
            "attachment_filename": msg.attachment_filename,
            "created_at": msg.created_at.isoformat(),
        }
        chat_realtime.broadcast_to_participants(participant_ids, payload)
        return msg

    def add_reaction(self, message_id: int, user_id: int, emoji: str) -> MessageReaction:
        emoji = validate_emoji_key(emoji)
        msg = self.db.query(Message).filter(Message.id == message_id).first()
        if not msg:
            raise ValueError("Message not found")
        self.assert_friend_participant(msg.conversation_id, user_id)
        existing = (
            self.db.query(MessageReaction)
            .filter(
                MessageReaction.message_id == message_id,
                MessageReaction.user_id == user_id,
                MessageReaction.emoji == emoji,
            )
            .first()
        )
        if existing:
            return existing
        r = MessageReaction(message_id=message_id, user_id=user_id, emoji=emoji)
        self.db.add(r)
        self.db.commit()
        self.db.refresh(r)

        conv = msg.conversation
        participant_ids = [p.user_id for p in conv.participants]
        payload = {
            "type": "reaction_added",
            "conversation_id": msg.conversation_id,
            "message_id": message_id,
            "user_id": user_id,
            "emoji": emoji,
        }
        chat_realtime.broadcast_to_participants(participant_ids, payload)
        return r

    def remove_reaction(self, message_id: int, user_id: int, emoji: str) -> bool:
        emoji = validate_emoji_key(emoji)
        msg = self.db.query(Message).filter(Message.id == message_id).first()
        if not msg:
            raise ValueError("Message not found")
        self.assert_friend_participant(msg.conversation_id, user_id)
        row = (
            self.db.query(MessageReaction)
            .filter(
                MessageReaction.message_id == message_id,
                MessageReaction.user_id == user_id,
                MessageReaction.emoji == emoji,
            )
            .first()
        )
        if not row:
            return False
        self.db.delete(row)
        self.db.commit()
        conv = msg.conversation
        participant_ids = [p.user_id for p in conv.participants]
        payload = {
            "type": "reaction_removed",
            "conversation_id": msg.conversation_id,
            "message_id": message_id,
            "user_id": user_id,
            "emoji": emoji,
        }
        chat_realtime.broadcast_to_participants(participant_ids, payload)
        return True
    def mark_messages_as_delivered(self, user_id: int, conversation_id: int) -> int:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        # Only update messages NOT sent by this user
        count = (
            self.db.query(Message)
            .filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
                Message.delivered_at.is_(None)
            )
            .update({"delivered_at": now}, synchronize_session=False)
        )
        self.db.commit()
        
        if count > 0:
            conv = self.get_conversation(conversation_id)
            if conv:
                payload = {
                    "type": "messages_delivered",
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "delivered_at": now.isoformat()
                }
                chat_realtime.broadcast_to_participants([p.user_id for p in conv.participants], payload)
        return count

    def mark_messages_as_read(self, user_id: int, conversation_id: int) -> int:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        # Only update messages NOT sent by this user
        count = (
            self.db.query(Message)
            .filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
                Message.read_at.is_(None)
            )
            .update({"read_at": now, "delivered_at": func.coalesce(Message.delivered_at, now)}, synchronize_session=False)
        )
        self.db.commit()
        
        if count > 0:
            conv = self.get_conversation(conversation_id)
            if conv:
                payload = {
                    "type": "messages_read",
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "read_at": now.isoformat()
                }
                chat_realtime.broadcast_to_participants([p.user_id for p in conv.participants], payload)
        return count
