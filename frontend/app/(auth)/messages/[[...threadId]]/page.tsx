'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import {
  ArrowLeft,
  Loader2,
  Paperclip,
  SendHorizontal,
  Smile,
  X,
  Check,
  CheckCheck,
  Search,
  MoreVertical,
  Phone,
  Video,
  Info,
  Lock
} from 'lucide-react';
import { apiClient, type ChatMessage, type ConversationListItem } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const MAX_ATTACH_BYTES = 10 * 1024 * 1024;

export default function MessagesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, fetchUser } = useAuthStore();

  const segments = params.threadId as string[] | undefined;
  const threadIdFromPath = segments?.[0] ? parseInt(segments[0], 10) : null;

  const conversations = useChatStore((s) => s.conversations);
  const fetchConversations = useChatStore((s) => s.fetchConversations);
  const openThread = useChatStore((s) => s.openThread);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);
  const messagesByConversation = useChatStore((s) => s.messagesByConversation);
  const messageCursors = useChatStore((s) => s.messageCursors);
  const typingUserIds = useChatStore((s) => s.typingUserIds);
  const sendTextMessage = useChatStore((s) => s.sendTextMessage);
  const sendTypingStart = useChatStore((s) => s.sendTypingStart);
  const sendTypingStop = useChatStore((s) => s.sendTypingStop);
  const leaveConversation = useChatStore((s) => s.leaveConversation);
  const onlineFriends = useChatStore((s) => s.onlineFriends);
  const fetchOnlineFriends = useChatStore((s) => s.fetchOnlineFriends);

  const [composer, setComposer] = useState('');
  const [quoted, setQuoted] = useState<ChatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [opening, setOpening] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUser().catch(() => {});
  }, [fetchUser]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchConversations().catch(() => {});
  }, [isAuthenticated, fetchConversations]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOnlineFriends().catch(() => {});
  }, [isAuthenticated, fetchOnlineFriends]);

  const openUserId = searchParams.get('open');
  useEffect(() => {
    if (!isAuthenticated || !openUserId) return;
    const uid = parseInt(openUserId, 10);
    if (Number.isNaN(uid)) return;
    setOpening(true);
    apiClient
      .openDirectConversation(uid)
      .then(({ conversation_id }) => {
        router.replace(`/messages/${conversation_id}`);
      })
      .catch(() => {})
      .finally(() => setOpening(false));
  }, [isAuthenticated, openUserId, router]);

  useEffect(() => {
    if (!threadIdFromPath || !isAuthenticated) return;
    openThread(threadIdFromPath).catch(() => {});
    return () => {
      leaveConversation(threadIdFromPath);
    };
  }, [threadIdFromPath, isAuthenticated, openThread, leaveConversation]);

  const activeMessages = threadIdFromPath
    ? messagesByConversation[threadIdFromPath] || []
    : [];

  useEffect(() => {
    if (threadIdFromPath && activeMessages.length > 0) {
      useChatStore.getState().sendMessagesRead(threadIdFromPath);
    }
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, threadIdFromPath]);

  const otherUser = useMemo(() => {
    if (!threadIdFromPath) return null;
    const row = conversations.find((c) => c.conversation_id === threadIdFromPath);
    return row?.other_user ?? null;
  }, [conversations, threadIdFromPath]);

  const typingNames = useMemo(() => {
    if (!threadIdFromPath || !otherUser) return '';
    const ids = typingUserIds[threadIdFromPath];
    if (!ids || ids.size === 0) return '';
    if (ids.has(otherUser.id)) return `${otherUser.username} is typing…`;
    return 'Someone is typing…';
  }, [threadIdFromPath, typingUserIds, otherUser]);

  const onComposerChange = useCallback(
    (v: string) => {
      setComposer(v);
      if (!threadIdFromPath) return;
      sendTypingStart(threadIdFromPath);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => sendTypingStop(threadIdFromPath), 450);
    },
    [threadIdFromPath, sendTypingStart, sendTypingStop]
  );

  const send = async () => {
    if (!threadIdFromPath || !composer.trim()) return;
    setSending(true);
    try {
      await sendTextMessage(threadIdFromPath, composer, quoted?.id ?? null);
      setComposer('');
      setQuoted(null);
      if (threadIdFromPath) sendTypingStop(threadIdFromPath);
    } catch {
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = useMemo(() => {
    if (!searchTerm) return conversations;
    return conversations.filter(c => 
      c.other_user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  const onAttach = async (file: File | null) => {
    if (!file || !threadIdFromPath) return;
    if (file.size > MAX_ATTACH_BYTES) {
      alert('File must be 10MB or smaller');
      return;
    }
    setSending(true);
    try {
      const presign = await apiClient.presignChatAttachment(threadIdFromPath, {
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
      });
      await apiClient.uploadToPresignedUrl(presign.upload_url, file, file.type || 'application/octet-stream');
      await apiClient.postConversationMessage(threadIdFromPath, {
        body: null,
        attachment_key: presign.attachment_key,
        attachment_mime: file.type || 'application/octet-stream',
        attachment_size: file.size,
        attachment_filename: file.name,
      });
      await fetchConversations();
      await openThread(threadIdFromPath);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Sign in to view messages.</p>
        <Button asChild>
          <Link href="/login?next=/messages">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto h-[calc(100vh-6rem)] max-w-7xl px-4 py-2">
      <Card className="flex h-full overflow-hidden border-border/50 bg-card/30 backdrop-blur-md shadow-2xl rounded-2xl">
        {/* Sidebar */}
        <aside
          className={cn(
            'flex w-full flex-col border-r border-border/50 lg:w-[350px]',
            threadIdFromPath ? 'hidden lg:flex' : 'flex'
          )}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-2xl font-bold tracking-tight text-primary">Chat</h1>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-9 rounded-full bg-background/50 border-none ring-1 ring-border/50 focus-visible:ring-primary/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
            {filteredConversations.map((c: ConversationListItem) => (
              <Link
                key={c.conversation_id}
                href={`/messages/${c.conversation_id}`}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200',
                  threadIdFromPath === c.conversation_id 
                    ? 'bg-primary/10 shadow-sm ring-1 ring-primary/20' 
                    : 'hover:bg-muted/50'
                )}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
                    <AvatarImage src={c.other_user.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/5 text-primary font-bold">
                      {c.other_user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {onlineFriends.some(f => f.id === c.other_user.id) && (
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-green-500 shadow-sm" />
                  )}
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={cn(
                      "truncate font-semibold text-sm",
                      threadIdFromPath === c.conversation_id ? "text-primary" : "text-foreground"
                    )}>@{c.other_user.username}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                      {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.last_message_sender_id === user?.id && c.last_message_preview && (
                      <div className="flex-shrink-0">
                        {c.last_message_read_at ? (
                          <CheckCheck className="h-3 w-3 text-blue-400" />
                        ) : c.last_message_delivered_at ? (
                          <CheckCheck className="h-3 w-3 text-muted-foreground/40" />
                        ) : (
                          <Check className="h-3 w-3 text-muted-foreground/40" />
                        )}
                      </div>
                    )}
                    <p className="truncate text-xs text-muted-foreground/80 leading-relaxed">
                      {c.last_message_preview || 'No messages yet'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
            
            {filteredConversations.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">No conversations found</p>
              </div>
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <main
          className={cn(
            'relative flex flex-1 flex-col overflow-hidden',
            threadIdFromPath ? 'flex' : 'hidden lg:flex'
          )}
        >
          {!threadIdFromPath ? (
            <div className="m-auto flex flex-col items-center gap-4 text-center">
              <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center shadow-inner">
                <SendHorizontal className="h-10 w-10 text-primary/40" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Select a conversation</h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                  Pick a friend from the left to start a modernized chat experience.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <header className="flex items-center justify-between border-b border-border/50 bg-background/20 backdrop-blur-sm px-6 py-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden rounded-full h-10 w-10"
                    onClick={() => router.push('/messages')}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  {otherUser && (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/10 shadow-sm">
                        <AvatarImage src={otherUser.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">
                          {otherUser.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold tracking-tight text-sm">@{otherUser.username}</p>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          {typingNames ? (
                            <span className="text-primary animate-pulse">{typingNames}</span>
                          ) : (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              Active now
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary transition-colors">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary transition-colors">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary transition-colors" asChild>
                    <Link href={`/profile/${encodeURIComponent(otherUser?.username || '')}`}>
                      <Info className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </header>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scroll-smooth bg-gradient-to-b from-transparent to-primary/[0.02]">
                {messageCursors[threadIdFromPath] != null && (
                  <div className="flex justify-center pb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs bg-background/50 border-border/50"
                      onClick={() => loadOlderMessages(threadIdFromPath)}
                    >
                      Load older messages
                    </Button>
                  </div>
                )}

                {/* WhatsApp-style E2EE Notice Banner */}
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 dark:border-amber-500/20 text-xs text-amber-600/90 dark:text-amber-400/90 text-center gap-1.5 shadow-sm max-w-md mx-auto my-2 animate-in fade-in duration-300">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                    End-to-End Encrypted
                  </div>
                  <p className="leading-relaxed max-w-[90%] font-medium text-[11px]">
                    Messages are end-to-end encrypted. No one outside of this chat, not even NotebookSocial, can read them.
                  </p>
                </div>

                {activeMessages.map((m, idx) => {
                  const mine = user?.id === m.sender_id;
                  const showDateHeader = idx === 0 || false; // Simplification for now
                  
                  return (
                    <div key={m.id} className={cn('flex group', mine ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'relative flex flex-col gap-1 max-w-[75%]',
                        mine ? 'items-end' : 'items-start'
                      )}>
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all duration-200 group-hover:shadow-md',
                            mine 
                              ? 'bg-primary text-primary-foreground rounded-tr-none' 
                              : 'bg-muted/80 backdrop-blur-sm text-foreground rounded-tl-none border border-border/50'
                          )}
                        >
                          {m.quoted_message_id && (
                            <div className="mb-2 border-l-2 border-primary/30 pl-3 py-1 text-[11px] opacity-80 italic bg-black/5 rounded-r-sm">
                              Quoted message
                            </div>
                          )}
                          {m.body && <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>}
                          {m.attachment_filename && (
                            <div className="mt-2 flex items-center gap-2 rounded-lg bg-black/10 p-2 text-xs">
                              <Paperclip className="h-3 w-3" />
                              <span className="truncate">{m.attachment_filename}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 px-1">
                          {mine && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                className="text-[10px] text-muted-foreground hover:text-primary"
                                onClick={() => setQuoted(m)}
                              >
                                Quote
                              </button>
                            </div>
                          )}
                          
                          {mine ? (
                            <div className="flex items-center">
                              {m.read_at ? (
                                <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                              ) : m.delivered_at ? (
                                <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/40" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-muted-foreground/40" />
                              )}
                            </div>
                          ) : (
                            <span className="text-[9px] text-muted-foreground/60 font-medium">10:45 AM</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={listEndRef} />
              </div>

              {/* Composer */}
              <footer className="border-t border-border/50 p-6 bg-background/40 backdrop-blur-sm">
                {quoted && (
                  <div className="flex items-center justify-between gap-4 rounded-xl bg-primary/5 px-4 py-2 text-xs mb-3 border border-primary/10">
                    <div className="flex flex-col">
                      <span className="font-bold text-primary opacity-70">Quoting message</span>
                      <span className="line-clamp-1 opacity-70">{quoted.body || quoted.attachment_filename}</span>
                    </div>
                    <button type="button" onClick={() => setQuoted(null)} className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                      <X className="h-3 w-3 text-primary" />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-3 items-end">
                  <div className="flex items-center gap-1.5 pb-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => onAttach(e.target.files?.[0] || null)}
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                          <Smile className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="border-0 bg-transparent p-0 shadow-2xl mb-4" side="top">
                        <Picker
                          data={data}
                          theme="dark"
                          onEmojiSelect={(e: { native: string }) => {
                            setComposer((c) => c + e.native);
                          }}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex-1 relative">
                    <Textarea
                      value={composer}
                      onChange={(e) => onComposerChange(e.target.value)}
                      placeholder="Type a message..."
                      rows={1}
                      className="min-h-[44px] max-h-[120px] resize-none rounded-2xl bg-background/50 border-border/50 py-3 px-4 focus-visible:ring-primary/20 focus-visible:border-primary/30 shadow-inner text-sm scrollbar-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                    />
                  </div>
                  
                  <Button
                    size="icon"
                    className="h-11 w-11 rounded-full shadow-lg shadow-primary/20 transition-transform active:scale-95 shrink-0"
                    disabled={sending || !composer.trim()}
                    onClick={() => send()}
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
                  </Button>
                </div>
              </footer>
            </>
          )}
        </main>

        {/* Right Sidebar - Info */}
        {threadIdFromPath && otherUser && (
          <aside className="hidden xl:flex w-[300px] flex-col border-l border-border/50 bg-background/20 p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24 ring-4 ring-primary/5 shadow-xl">
                <AvatarImage src={otherUser.avatar_url || undefined} />
                <AvatarFallback className="text-2xl font-bold">{otherUser.username.slice(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold tracking-tight">@{otherUser.username}</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-1">
                  Active now
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                  <Info className="h-3 w-3" />
                  About
                </h3>
                <p className="text-sm leading-relaxed opacity-90 italic">
                  "Developer and data science enthusiast."
                </p>
              </div>

              <div className="pt-6 border-t border-border/50 space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3 rounded-xl h-11 shadow-sm hover:bg-primary/5 transition-all" asChild>
                  <Link href={`/profile/${encodeURIComponent(otherUser.username)}`}>
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={otherUser.avatar_url || undefined} />
                    </Avatar>
                    View Profile
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 rounded-xl h-11 shadow-sm hover:text-destructive hover:bg-destructive/5 transition-all">
                  <X className="h-4 w-4" />
                  Block User
                </Button>
              </div>
            </div>
          </aside>
        )}
      </Card>
    </div>
  );
}
