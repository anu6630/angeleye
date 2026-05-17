/** Build WebSocket URL for chat from NEXT_PUBLIC_API_URL (same host as REST). */
export function getChatWebSocketUrl(): string {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  const u = new URL(api);
  const wsProto = u.protocol === 'https:' ? 'wss:' : 'ws:';
  const path = u.pathname.replace(/\/$/, '');
  return `${wsProto}//${u.host}${path}/ws/chat`;
}
