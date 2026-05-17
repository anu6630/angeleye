import { create } from 'zustand';
import {
  apiClient,
  type ChatMessage,
  type ConversationListItem,
  type FriendUserBrief,
} from '@/lib/api-client';
import { getChatWebSocketUrl } from '@/lib/ws-url';
import { useAuthStore } from '@/stores/auth-store';
import {
  getOrGenerateMyKeys,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
} from '@/lib/crypto';

export type PresenceScope = 'service_worker' | 'in_page_only';

interface ChatState {
  presenceScope: PresenceScope;
  setPresenceScope: (s: PresenceScope) => void;
  ws: WebSocket | null;
  pingTimer: ReturnType<typeof setInterval> | null;
  conversations: ConversationListItem[];
  messagesByConversation: Record<number, ChatMessage[]>;
  messageCursors: Record<number, number | null | undefined>;
  typingUserIds: Record<number, Set<number>>;
  activeConversationId: number | null;
  onlineFriends: FriendUserBrief[];
  chatWindows: { 
    conversationId: number; 
    isMinimized: boolean; 
    unreadCount: number; 
    otherUser: FriendUserBrief;
  }[];

  connect: () => void;
  disconnect: () => void;
  joinConversation: (id: number) => void;
  leaveConversation: (id: number) => void;
  sendTypingStart: (id: number) => void;
  sendTypingStop: (id: number) => void;
  sendMessagesDelivered: (id: number) => void;
  sendMessagesRead: (id: number) => void;
  fetchConversations: () => Promise<void>;
  fetchOnlineFriends: () => Promise<void>;
  openThread: (conversationId: number) => Promise<void>;
  loadOlderMessages: (conversationId: number) => Promise<void>;
  sendTextMessage: (
    conversationId: number,
    body: string,
    quotedMessageId?: number | null
  ) => Promise<void>;
  handleWsData: (data: Record<string, unknown>) => Promise<void> | void;
  
  openChatWindow: (conversationId: number, otherUser: FriendUserBrief) => Promise<void>;
  minimizeChatWindow: (conversationId: number) => void;
  closeChatWindow: (conversationId: number) => void;
}

function wsSend(ws: WebSocket | null, payload: Record<string, unknown>) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

const sharedKeysCache: Record<number, CryptoKey> = {};

async function getSharedKeyForConversation(conversationId: number): Promise<CryptoKey | null> {
  const me = useAuthStore.getState().user;
  if (!me) return null;

  let otherUserId: number | undefined;
  const storeState = useChatStore.getState();
  const window = storeState.chatWindows.find(w => w.conversationId === conversationId);
  if (window) {
    otherUserId = window.otherUser.id;
  } else {
    const conv = storeState.conversations.find(c => c.conversation_id === conversationId);
    if (conv) {
      otherUserId = conv.other_user.id;
    }
  }

  if (!otherUserId) return null;

  if (sharedKeysCache[otherUserId]) {
    return sharedKeysCache[otherUserId];
  }

  try {
    const myKeyPairJwk = await getOrGenerateMyKeys(me.id);
    const res = await apiClient.getUserPublicKey(otherUserId);
    if (!res.public_key) {
      return null;
    }
    const peerPublicKeyJwk = JSON.parse(res.public_key);
    const sharedKey = await deriveSharedKey(myKeyPairJwk.privateKey, peerPublicKeyJwk);
    sharedKeysCache[otherUserId] = sharedKey;
    return sharedKey;
  } catch (err) {
    console.error('Failed to get/derive E2EE shared key for conversation:', conversationId, err);
    return null;
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  presenceScope: 'in_page_only',
  setPresenceScope: (s) => set({ presenceScope: s }),
  ws: null,
  pingTimer: null,
  conversations: [],
  messagesByConversation: {},
  messageCursors: {},
  typingUserIds: {},
  activeConversationId: null,
  onlineFriends: [],
  chatWindows: [],

  connect: () => {
    const { ws: existing } = get();
    if (existing && existing.readyState === WebSocket.OPEN) return;
    if (!useAuthStore.getState().isAuthenticated) return;

    // Ensure our E2EE keys are generated and registered on the server on connect
    const me = useAuthStore.getState().user;
    if (me) {
      getOrGenerateMyKeys(me.id).then(async (pair) => {
        try {
          await apiClient.registerPublicKey(JSON.stringify(pair.publicKey));
        } catch (err) {
          console.error("Failed to register E2EE public key:", err);
        }
      }).catch(err => {
        console.error("E2EE key generation failed:", err);
      });
    }

    let url = getChatWebSocketUrl();
    try {
      const token =
        typeof document !== 'undefined'
          ? document.cookie
              .split('; ')
              .find((row) => row.startsWith('access_token='))
              ?.split('=')[1]
          : undefined;
      if (token) {
        const u = new URL(url);
        u.searchParams.set('token', token);
        url = u.toString();
      }
    } catch {
      /* cookie parse optional */
    }

    const ws = new WebSocket(url);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as Record<string, unknown>;
        get().handleWsData(data);
      } catch {
        /* ignore */
      }
    };
    ws.onopen = () => {
      const active = get().activeConversationId;
      if (active) {
        wsSend(ws, { type: 'join_conversation', conversation_id: active });
      }
      // Also join all active chat window conversations
      get().chatWindows.forEach(w => {
        wsSend(ws, { type: 'join_conversation', conversation_id: w.conversationId });
      });
    };

    const pingTimer = setInterval(() => {
      wsSend(get().ws, { type: 'ping' });
      get().fetchOnlineFriends().catch(() => {});
    }, 25000);

    set({ ws, pingTimer });
  },

  disconnect: () => {
    const { ws, pingTimer } = get();
    if (pingTimer) clearInterval(pingTimer);
    if (ws) {
      ws.close();
    }
    set({ ws: null, pingTimer: null });
  },

  joinConversation: (id) => {
    wsSend(get().ws, { type: 'join_conversation', conversation_id: id });
  },

  leaveConversation: (id) => {
    wsSend(get().ws, { type: 'leave_conversation', conversation_id: id });
  },

  sendTypingStart: (id) => {
    wsSend(get().ws, { type: 'typing_start', conversation_id: id });
  },

  sendTypingStop: (id) => {
    wsSend(get().ws, { type: 'typing_stop', conversation_id: id });
  },

  sendMessagesDelivered: (id) => {
    wsSend(get().ws, { type: 'messages_delivered', conversation_id: id });
  },

  sendMessagesRead: (id) => {
    wsSend(get().ws, { type: 'messages_read', conversation_id: id });
  },

  fetchConversations: async () => {
    const rows = await apiClient.listConversations();
    const decryptedRows = await Promise.all(
      rows.map(async (row) => {
        if (row.last_message_preview && row.last_message_preview.startsWith('e2ee:v1:')) {
          const sharedKey = await getSharedKeyForConversation(row.conversation_id);
          if (sharedKey) {
            const dec = await decryptMessage(row.last_message_preview, sharedKey);
            return { ...row, last_message_preview: dec };
          }
        }
        return row;
      })
    );
    set({ conversations: decryptedRows });
  },

  fetchOnlineFriends: async () => {
    const rows = await apiClient.listOnlineFriends();
    set({ onlineFriends: rows });
  },

  openThread: async (conversationId) => {
    const page = await apiClient.getConversationMessages(conversationId, undefined, 50);
    const asc = [...page.messages].reverse();
    const sharedKey = await getSharedKeyForConversation(conversationId);
    const decryptedMessages = await Promise.all(
      asc.map(async (m) => {
        if (m.body && m.body.startsWith('e2ee:v1:') && sharedKey) {
          const decryptedBody = await decryptMessage(m.body, sharedKey);
          return { ...m, body: decryptedBody };
        }
        return m;
      })
    );
    set((s) => ({
      activeConversationId: conversationId,
      messagesByConversation: { ...s.messagesByConversation, [conversationId]: decryptedMessages },
      messageCursors: { ...s.messageCursors, [conversationId]: page.next_cursor },
      // Close floating window if opening in main thread
      chatWindows: s.chatWindows.filter(w => w.conversationId !== conversationId)
    }));
    get().joinConversation(conversationId);
    get().sendMessagesRead(conversationId);
  },

  loadOlderMessages: async (conversationId) => {
    const cur = get().messageCursors[conversationId];
    if (cur == null) return;
    const page = await apiClient.getConversationMessages(conversationId, cur, 40);
    const olderAsc = [...page.messages].reverse();
    const sharedKey = await getSharedKeyForConversation(conversationId);
    const decryptedOlder = await Promise.all(
      olderAsc.map(async (m) => {
        if (m.body && m.body.startsWith('e2ee:v1:') && sharedKey) {
          const decryptedBody = await decryptMessage(m.body, sharedKey);
          return { ...m, body: decryptedBody };
        }
        return m;
      })
    );
    set((s) => {
      const prev = s.messagesByConversation[conversationId] || [];
      return {
        messagesByConversation: {
          ...s.messagesByConversation,
          [conversationId]: [...decryptedOlder, ...prev],
        },
        messageCursors: { ...s.messageCursors, [conversationId]: page.next_cursor },
      };
    });
  },

  sendTextMessage: async (conversationId, body, quotedMessageId) => {
    const me = useAuthStore.getState().user;
    if (!me) throw new Error('Not signed in');
    const text = body.trim();
    if (!text) return;

    const tempId = -Math.floor(Date.now() + Math.random() * 1000);
    const optimistic: ChatMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: me.id,
      body: text,
      quoted_message_id: quotedMessageId ?? null,
      created_at: new Date().toISOString(),
      reactions: [],
    };

    set((s) => ({
      messagesByConversation: {
        ...s.messagesByConversation,
        [conversationId]: [...(s.messagesByConversation[conversationId] || []), optimistic],
      },
    }));

    try {
      let bodyToSend = text;
      const sharedKey = await getSharedKeyForConversation(conversationId);
      if (sharedKey) {
        bodyToSend = await encryptMessage(text, sharedKey);
      }

      const saved = await apiClient.postConversationMessage(conversationId, {
        body: bodyToSend,
        quoted_message_id: quotedMessageId ?? null,
      });

      let savedDecrypted = saved;
      if (saved.body && saved.body.startsWith('e2ee:v1:') && sharedKey) {
        const decryptedBody = await decryptMessage(saved.body, sharedKey);
        savedDecrypted = { ...saved, body: decryptedBody };
      }

      set((s) => {
        const list = s.messagesByConversation[conversationId] || [];
        const filtered = list.filter((m) => m.id !== tempId);
        // Avoid duplicate message in UI if WebSocket message already arrived and got appended
        if (filtered.some((m) => m.id === savedDecrypted.id)) {
          return {
            messagesByConversation: {
              ...s.messagesByConversation,
              [conversationId]: filtered,
            },
          };
        }
        return {
          messagesByConversation: {
            ...s.messagesByConversation,
            [conversationId]: filtered.concat(savedDecrypted),
          },
        };
      });
      await get().fetchConversations();
    } catch (err) {
      console.error('Failed to send text message:', err);
      set((s) => {
        const list = s.messagesByConversation[conversationId] || [];
        return {
          messagesByConversation: {
            ...s.messagesByConversation,
            [conversationId]: list.filter((m) => m.id !== tempId),
          },
        };
      });
      throw new Error('Failed to send message');
    }
  },

  handleWsData: async (data) => {
    const t = data.type as string;
    if (t === 'hello' || t === 'pong') return;
    
    if (t === 'typing') {
      const cid = data.conversation_id as number;
      const uid = data.user_id as number;
      const active = data.active as boolean;
      const me = useAuthStore.getState().user?.id;
      if (uid === me) return;
      set((s) => {
        const next = { ...s.typingUserIds };
        const setU = new Set(next[cid] || []);
        if (active) setU.add(uid);
        else setU.delete(uid);
        next[cid] = setU;
        return { typingUserIds: next };
      });
      return;
    }

    if (t === 'message') {
      const cid = data.conversation_id as number;
      const mid = data.message_id as number;
      const sender_id = data.sender_id as number;
      const me = useAuthStore.getState().user?.id;
      
      get().fetchConversations().catch(() => {});
      
      // Update thread if open
      if (get().activeConversationId === cid || get().chatWindows.some(w => w.conversationId === cid)) {
        const sharedKey = await getSharedKeyForConversation(cid);
        let bodyText = data.body as string;
        if (bodyText && bodyText.startsWith('e2ee:v1:') && sharedKey) {
          bodyText = await decryptMessage(bodyText, sharedKey);
        }

        const newMsg: ChatMessage = {
          id: mid,
          conversation_id: cid,
          sender_id: sender_id,
          body: bodyText,
          attachment_filename: data.attachment_filename as string,
          created_at: data.created_at as string,
          reactions: [],
        };

        if (sender_id !== me) {
          get().sendMessagesDelivered(cid);
        }

        set(s => {
          const list = s.messagesByConversation[cid] || [];
          if (list.some(m => m.id === mid)) return s;
          return {
            messagesByConversation: {
              ...s.messagesByConversation,
              [cid]: [...list, newMsg]
            }
          };
        });
      }

      // Auto-open chat box (Facebook style) - ONLY if not already in main thread
      if (sender_id !== me && get().activeConversationId !== cid) {
        const otherUser: FriendUserBrief = {
          id: sender_id,
          username: data.sender_username as string,
          avatar_url: data.sender_avatar as string
        };
        get().openChatWindow(cid, otherUser);
      } else if (sender_id !== me && get().activeConversationId === cid) {
        // If in main thread, still mark as read
        get().sendMessagesRead(cid);
      }
    }

    if (t === 'messages_delivered' || t === 'messages_read') {
      const cid = data.conversation_id as number;
      const uid = data.user_id as number;
      const time = (data.delivered_at || data.read_at) as string;
      const field = t === 'messages_delivered' ? 'delivered_at' : 'read_at';

      set(s => {
        const msgs = s.messagesByConversation[cid];
        if (!msgs) return s;
        return {
          messagesByConversation: {
            ...s.messagesByConversation,
            [cid]: msgs.map(m => {
              if (m.sender_id !== uid && !m[field]) {
                return { ...m, [field]: time };
              }
              return m;
            })
          }
        };
      });
    }

    if (t === 'reaction_added' || t === 'reaction_removed') {
      const cid = data.conversation_id as number;
      if (get().activeConversationId === cid || get().chatWindows.some(w => w.conversationId === cid)) {
        get().openThread(cid).catch(() => {});
      }
    }
  },

  openChatWindow: async (conversationId, otherUser) => {
    set(s => {
      const exists = s.chatWindows.find(w => w.conversationId === conversationId);
      if (exists) {
        return {
          chatWindows: s.chatWindows.map(w => 
            w.conversationId === conversationId ? { ...w, isMinimized: false, unreadCount: 0 } : w
          )
        };
      }
      return {
        chatWindows: [...s.chatWindows, { conversationId, isMinimized: false, unreadCount: 0, otherUser }]
      };
    });
    get().joinConversation(conversationId);
    get().sendMessagesRead(conversationId);

    try {
      const page = await apiClient.getConversationMessages(conversationId, undefined, 50);
      const asc = [...page.messages].reverse();
      const sharedKey = await getSharedKeyForConversation(conversationId);
      const decryptedMessages = await Promise.all(
        asc.map(async (m) => {
          if (m.body && m.body.startsWith('e2ee:v1:') && sharedKey) {
            const decryptedBody = await decryptMessage(m.body, sharedKey);
            return { ...m, body: decryptedBody };
          }
          return m;
        })
      );
      set(s => ({
        messagesByConversation: {
          ...s.messagesByConversation,
          [conversationId]: decryptedMessages
        },
        messageCursors: {
          ...s.messageCursors,
          [conversationId]: page.next_cursor
        }
      }));
    } catch (err) {
      console.error("Failed to load messages for chat window:", err);
    }
  },

  minimizeChatWindow: (conversationId) => {
    set(s => ({
      chatWindows: s.chatWindows.map(w => 
        w.conversationId === conversationId ? { ...w, isMinimized: true } : w
      )
    }));
  },

  closeChatWindow: (conversationId) => {
    set(s => ({
      chatWindows: s.chatWindows.filter(w => w.conversationId !== conversationId)
    }));
    get().leaveConversation(conversationId);
  }
}));
