import { apiClient } from "@/lib/api/client";
import { resolveApiBaseUrl } from "@/lib/api/baseUrl";
import { getAccessToken } from "@/lib/auth/tokenStore";

export interface InboxThreadCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  smsOptedOutAt: string | null;
}

export interface InboxThreadItem {
  id: string;
  customerId: string;
  customer: InboxThreadCustomer;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
}

export interface InboxMessageItem {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  body: string;
  status: string;
  createdAt: string;
  sentBy: { id: string; firstName: string; lastName: string } | null;
}

export async function listInboxThreads(): Promise<InboxThreadItem[]> {
  const { data } = await apiClient.get<{ success: true; threads: InboxThreadItem[] }>(
    "/api/inbox/threads",
  );
  return data.threads;
}

export async function openInboxThreadForCustomer(
  customerId: string,
): Promise<{ id: string; customerId: string }> {
  const { data } = await apiClient.post<{
    success: true;
    thread: { id: string; customerId: string };
  }>("/api/inbox/threads/open", { customerId });
  return data.thread;
}

export async function getInboxThreadMessages(
  threadId: string,
  options?: { before?: string; limit?: number },
): Promise<{
  thread: { id: string; customerId: string; unreadCount: number };
  messages: InboxMessageItem[];
}> {
  const { data } = await apiClient.get<{
    success: true;
    thread: { id: string; customerId: string; unreadCount: number };
    messages: InboxMessageItem[];
  }>(`/api/inbox/threads/${threadId}/messages`, {
    params: {
      ...(options?.before ? { before: options.before } : {}),
      ...(options?.limit ? { limit: options.limit } : {}),
    },
  });
  return { thread: data.thread, messages: data.messages };
}

export async function sendInboxMessage(threadId: string, body: string): Promise<void> {
  await apiClient.post(`/api/inbox/threads/${threadId}/send`, { body });
}

export async function markInboxThreadRead(threadId: string): Promise<void> {
  await apiClient.post(`/api/inbox/threads/${threadId}/read`);
}

export type InboxRealtimeEvent = {
  type: string;
  companyId?: string;
  threadId?: string;
  messageId?: string;
};

export function subscribeInboxEvents(
  companyId: string,
  onEvent: (event: InboxRealtimeEvent) => void,
): () => void {
  const token = getAccessToken();
  if (!token) {
    return () => {};
  }

  const base = resolveApiBaseUrl();
  const url = `${base}/api/inbox/events?companyId=${encodeURIComponent(companyId)}&token=${encodeURIComponent(token)}`;
  const source = new EventSource(url);

  source.onmessage = (ev) => {
    try {
      const parsed = JSON.parse(ev.data) as InboxRealtimeEvent;
      onEvent(parsed);
    } catch {
      /* ignore malformed */
    }
  };

  source.onerror = () => {
    /* browser will auto-reconnect */
  };

  return () => source.close();
}
