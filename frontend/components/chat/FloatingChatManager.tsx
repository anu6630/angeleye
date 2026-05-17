'use client';

import { useChatStore } from '@/stores/chat-store';
import { ChatBox } from './ChatBox';

export function FloatingChatManager() {
  const chatWindows = useChatStore((s) => s.chatWindows);

  if (chatWindows.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 z-50 flex items-end gap-3 px-4 pointer-events-none">
      <div className="flex items-end gap-3 pointer-events-auto">
        {chatWindows.map((window) => (
          <ChatBox 
            key={window.conversationId} 
            conversationId={window.conversationId}
            isMinimized={window.isMinimized}
            unreadCount={window.unreadCount}
            otherUser={window.otherUser}
          />
        ))}
      </div>
    </div>
  );
}
