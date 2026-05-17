'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { type FriendUserBrief } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Minus, Maximize2, Send, Paperclip, Smile, Check, CheckCheck, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatBoxProps {
  conversationId: number;
  isMinimized: boolean;
  unreadCount: number;
  otherUser: FriendUserBrief;
}

export function ChatBox({ conversationId, isMinimized, unreadCount, otherUser }: ChatBoxProps) {
  const { 
    messagesByConversation, 
    sendTextMessage, 
    minimizeChatWindow, 
    openChatWindow, 
    closeChatWindow,
    sendMessagesRead,
    typingUserIds,
    sendTypingStart,
    sendTypingStop
  } = useChatStore();
  const me = useAuthStore((s) => s.user);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = messagesByConversation[conversationId] || [];
  const isTyping = typingUserIds[conversationId]?.size > 0;

  const onInputChange = (val: string) => {
    setInputValue(val);
    sendTypingStart(conversationId);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTypingStop(conversationId), 450);
  };

  useEffect(() => {
    if (!isMinimized) {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      sendMessagesRead(conversationId);
    }
  }, [messages.length, isMinimized, conversationId, sendMessagesRead]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const val = inputValue;
    setInputValue('');
    if (typingTimer.current) clearTimeout(typingTimer.current);
    sendTypingStop(conversationId);
    await sendTextMessage(conversationId, val);
  };

  if (isMinimized) {
    return (
      <div 
        onClick={() => openChatWindow(conversationId, otherUser)}
        className="flex h-12 w-64 cursor-pointer items-center justify-between rounded-t-xl bg-background px-3 shadow-lg ring-1 ring-border hover:bg-muted transition-all"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Avatar className="h-7 w-7 border">
            <AvatarImage src={otherUser.avatar_url || ''} />
            <AvatarFallback>{otherUser.username[0]}</AvatarFallback>
          </Avatar>
          <span className="truncate font-medium text-sm">{otherUser.username}</span>
          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              closeChatWindow(conversationId);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[450px] w-80 flex-col rounded-t-2xl bg-background shadow-2xl ring-1 ring-border overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between border-b bg-primary/5 p-3"
      >
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 ring-1 ring-border">
            <AvatarImage src={otherUser.avatar_url || ''} />
            <AvatarFallback>{otherUser.username[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">{otherUser.username}</span>
            {isTyping ? (
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider animate-pulse">Typing...</span>
            ) : (
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Online</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => minimizeChatWindow(conversationId)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
            onClick={() => closeChatWindow(conversationId)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {/* WhatsApp-style E2EE Notice */}
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 dark:border-amber-500/20 text-[10px] text-amber-600/90 dark:text-amber-400/90 text-center gap-1 shadow-sm">
          <div className="flex items-center gap-1 font-bold uppercase tracking-wider text-[9px]">
            <Lock className="h-3 w-3 text-amber-500" />
            End-to-End Encrypted
          </div>
          <p className="leading-normal max-w-[95%] font-medium">
            Messages are end-to-end encrypted. No one outside of this chat, not even NotebookSocial, can read them.
          </p>
        </div>

        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === me?.id;
          const showAvatar = idx === 0 || messages[idx-1].sender_id !== msg.sender_id;
          
          return (
            <div 
              key={msg.id} 
              className={cn(
                "flex items-end gap-2 max-w-[85%]",
                isMe ? "ml-auto flex-row-reverse" : ""
              )}
            >
              {!isMe && (
                <div className="w-6 h-6 flex-shrink-0">
                  {showAvatar && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={otherUser.avatar_url || ''} />
                      <AvatarFallback>{otherUser.username[0]}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1">
                <div 
                  className={cn(
                    "px-3 py-2 rounded-2xl text-sm break-words shadow-sm",
                    isMe 
                      ? "bg-primary text-primary-foreground rounded-br-none" 
                      : "bg-muted text-foreground rounded-bl-none"
                  )}
                >
                  {msg.body}
                </div>
                {isMe && (
                  <div className="flex justify-end mt-0.5">
                    {msg.read_at ? (
                      <CheckCheck className="h-3 w-3 text-blue-400" />
                    ) : msg.delivered_at ? (
                      <CheckCheck className="h-3 w-3 text-muted-foreground/60" />
                    ) : (
                      <Check className="h-3 w-3 text-muted-foreground/60" />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-8 items-center justify-center rounded-full bg-muted">
              <span className="flex gap-1">
                <span className="h-1 w-1 animate-bounce rounded-full bg-foreground/50" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-foreground/50 [animation-delay:0.2s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-foreground/50 [animation-delay:0.4s]" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-muted/20">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full flex-shrink-0 text-muted-foreground">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input 
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Type a message..."
            className="h-9 rounded-full bg-background border-border/50 text-xs focus-visible:ring-primary/30"
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-8 w-8 rounded-full flex-shrink-0"
            disabled={!inputValue.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
