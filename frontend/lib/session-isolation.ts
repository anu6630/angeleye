/**
 * Clear user-scoped client state when the authenticated account changes or logs out.
 * Avoids static imports that would create cycles (e.g. chat-store → auth-store).
 */
export async function clearSharedClientState(): Promise<void> {
  if (typeof window === 'undefined') return;

  const { useNotebookStore } = await import('@/stores/notebook-store');
  useNotebookStore.getState().reset();

  const { useCompilationStore } = await import('@/stores/compilation-store');
  useCompilationStore.getState().resetCompilation();

  const { useFeedStore } = await import('@/stores/feed-store');
  useFeedStore.getState().reset();

  const { useSocialStore } = await import('@/stores/social-store');
  useSocialStore.getState().reset();

  const { useChatStore } = await import('@/stores/chat-store');
  useChatStore.getState().disconnect();
  useChatStore.setState({
    conversations: [],
    messagesByConversation: {},
    messageCursors: {},
    typingUserIds: {},
    activeConversationId: null,
    onlineFriends: [],
  });
}
