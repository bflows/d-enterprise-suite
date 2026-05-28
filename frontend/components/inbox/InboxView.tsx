"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { getCustomers, type CustomerListItem } from "@/lib/api/customers";
import {
  getInboxThreadMessages,
  listInboxThreads,
  markInboxThreadRead,
  openInboxThreadForCustomer,
  sendInboxMessage,
  subscribeInboxEvents,
  type InboxMessageItem,
  type InboxThreadItem,
} from "@/lib/api/inbox";
import { HiChevronLeft } from "react-icons/hi2";

function displayName(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Customer";
}

function formatPhoneNumber(phone: string) {
  const match = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (!match) return phone;
  const [, areaCode, prefix, lineNumber] = match;
  return `+1 (${areaCode}) ${prefix}-${lineNumber}`;
}

/** User-facing label for outbound delivery state (Twilio `queued` means accepted, not stuck). */
function outboundStatusLabel(status: string): string | null {
  switch (status) {
    case "FAILED":
      return "Failed";
    case "UNDELIVERED":
      return "Undelivered";
    case "DELIVERED":
      return null;
    case "SENT":
    case "QUEUED":
    case "SENDING":
      return "Sent";
    default:
      return null;
  }
}

function formatMessageTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return fallback;
}

export default function InboxView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = useSelector((state: RootState) => selectCurrentCompanyId(state));

  const [threads, setThreads] = useState<InboxThreadItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessageItem[]>([]);
  const [search, setSearch] = useState("");
  const [composer, setComposer] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  /** Guards against out-of-order responses when switching threads quickly. */
  const activeMessagesThreadIdRef = useRef<string | null>(null);

  const scrollToLatestMessage = useCallback((behavior: ScrollBehavior = "auto") => {
    const run = () => {
      const container = messagesScrollRef.current;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior });
        return;
      }
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, []);

  const refreshThreads = useCallback(async () => {
    if (!companyId) return;
    setLoadingThreads(true);
    setError(null);
    try {
      const [threadList, customerList] = await Promise.all([
        listInboxThreads(),
        getCustomers(companyId),
      ]);
      setThreads(threadList);
      setCustomers(customerList.customers);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Could not load inbox."));
    } finally {
      setLoadingThreads(false);
    }
  }, [companyId]);

  const loadMessages = useCallback(
    async (threadId: string, options?: { clear?: boolean }) => {
      const clear = options?.clear ?? false;
      activeMessagesThreadIdRef.current = threadId;
      setLoadingMessages(true);
      if (clear) setMessages([]);
      setError(null);
      try {
        const { messages: list } = await getInboxThreadMessages(threadId);
        if (activeMessagesThreadIdRef.current !== threadId) return;
        setMessages(list);
        await markInboxThreadRead(threadId);
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t)),
        );
      } catch (err: unknown) {
        if (activeMessagesThreadIdRef.current !== threadId) return;
        setError(apiErrorMessage(err, "Could not load messages."));
      } finally {
        if (activeMessagesThreadIdRef.current === threadId) {
          setLoadingMessages(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    if (!companyId) return;
    const unsubscribe = subscribeInboxEvents(companyId, (event) => {
      if (
        event.type === "message.created" ||
        event.type === "message.status" ||
        event.type === "thread.updated"
      ) {
        void refreshThreads();
        if (
          event.threadId &&
          event.threadId === selectedThreadId &&
          (event.type === "message.created" || event.type === "message.status")
        ) {
          void loadMessages(event.threadId);
        }
      }
    });
    return unsubscribe;
  }, [companyId, selectedThreadId, refreshThreads, loadMessages]);

  useEffect(() => {
    if (searchParams.get("newJob") === "1") {
      queueMicrotask(() => router.replace("/schedule?newJob=1", { scroll: false }));
    } else if (searchParams.get("newCustomer") === "1") {
      queueMicrotask(() => router.replace("/customers?newCustomer=1", { scroll: false }));
    }
  }, [searchParams, router]);

  const selectThread = useCallback(
    async (threadId: string) => {
      setSelectedThreadId(threadId);
      await loadMessages(threadId, { clear: true });
    },
    [loadMessages],
  );

  const openCustomerChat = useCallback(
    async (customerId: string) => {
      activeMessagesThreadIdRef.current = null;
      setMessages([]);
      setLoadingMessages(true);
      setError(null);
      try {
        const thread = await openInboxThreadForCustomer(customerId);
        await refreshThreads();
        await selectThread(thread.id);
      } catch (err: unknown) {
        setError(apiErrorMessage(err, "Could not open conversation."));
      }
    },
    [refreshThreads, selectThread],
  );

  const handleSend = useCallback(async () => {
    if (!selectedThreadId || !composer.trim()) return;
    setSending(true);
    setError(null);
    const body = composer.trim();
    setComposer("");
    try {
      await sendInboxMessage(selectedThreadId, body);
      await loadMessages(selectedThreadId);
      await refreshThreads();
    } catch (err: unknown) {
      setComposer(body);
      setError(apiErrorMessage(err, "Could not send message."));
    } finally {
      setSending(false);
    }
  }, [selectedThreadId, composer, loadMessages, refreshThreads]);

  useEffect(() => {
    if (loadingMessages || !selectedThreadId) return;
    scrollToLatestMessage("smooth");
  }, [loadingMessages, messages, selectedThreadId, scrollToLatestMessage]);

  const searchLower = search.trim().toLowerCase();
  const threadByCustomerId = new Map(threads.map((t) => [t.customerId, t]));
  const filteredCustomers =
    searchLower.length === 0
      ? customers
      : customers.filter((c) => {
          const name = displayName(c.firstName, c.lastName).toLowerCase();
          return name.includes(searchLower) || c.phone.includes(search);
        });
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const lastA = threadByCustomerId.get(a.id)?.lastMessageAt;
    const lastB = threadByCustomerId.get(b.id)?.lastMessageAt;
    const timeA = lastA ? new Date(lastA).getTime() : 0;
    const timeB = lastB ? new Date(lastB).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return displayName(a.firstName, a.lastName)
      .toLowerCase()
      .localeCompare(displayName(b.firstName, b.lastName).toLowerCase());
  });
  const selectedThread = threads.find((t) => t.id === selectedThreadId) ?? null;
  const mobileChatOpen = Boolean(selectedThreadId);

  return (
    <div
      className={`flex flex-col ${mobileChatOpen ? "max-md:h-full max-md:min-h-0" : "gap-4"}`}
    >
      {error && !mobileChatOpen && (
        <p className="text-sm text-red-600 bg-red-50 py-2 px-3 rounded-lg" role="alert">
          {error}
        </p>
      )}

      <div
        className={`flex flex-col md:flex-row gap-4 ${
          mobileChatOpen
            ? "max-md:flex-1 max-md:min-h-0 max-md:gap-0"
            : "min-h-[60vh] md:min-h-[calc(100dvh-12rem)]"
        }`}
      >
        {/* Customer / thread list */}
        <div
          className={`md:w-80 shrink-0 flex flex-col rounded-lg border border-neutral-300 bg-neutral-50 overflow-hidden ${
            selectedThreadId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-3 border-b border-neutral-300">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers…"
              className="w-full py-2 px-3 rounded-lg text-p bg-neutral-200 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Search customers"
            />
          </div>
          <ul className="flex-1 overflow-y-auto divide-y divide-neutral-200">
            {loadingThreads && (
              <li className="p-4 text-p text-neutral-500">Loading…</li>
            )}
            {!loadingThreads && sortedCustomers.length === 0 && (
              <li className="p-4 text-p text-neutral-500">No customers found.</li>
            )}
            {sortedCustomers.map((c) => {
              const thread = threadByCustomerId.get(c.id);
              const isActive = thread?.id === selectedThreadId;
              const name = displayName(c.firstName, c.lastName);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (thread) {
                        void selectThread(thread.id);
                      } else {
                        void openCustomerChat(c.id);
                      }
                    }}
                    className={`w-full text-left p-3 transition-colors hover:bg-primary/5 ${
                      isActive ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-p text-neutral-900 truncate">
                        {name}
                      </span>
                      {thread && thread.unreadCount > 0 && (
                        <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-primary text-neutral-100 text-xs font-bold flex items-center justify-center">
                          {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 mt-0.5 truncate">
                      {formatPhoneNumber(c.phone)}
                    </p>
                    {thread?.lastMessagePreview && (
                      <p className="text-sm text-neutral-500 mt-1 truncate">
                        {thread.lastMessagePreview}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Chat panel — on mobile, fixed between navbar and bottom tab bar */}
        <div
          className={`flex-1 flex flex-col bg-neutral-50 overflow-hidden min-h-0 md:rounded-lg md:border md:border-neutral-300 ${
            mobileChatOpen
              ? "max-md:fixed max-md:inset-x-0 max-md:z-20 max-md:flex max-md:flex-col max-md:top-[calc(env(safe-area-inset-top,0px)+4rem)] max-md:bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]"
              : "min-h-[50vh] md:min-h-0"
          } ${selectedThreadId ? "flex" : "hidden md:flex"}`}
        >
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center p-6 text-neutral-500 text-p">
              Select a customer to view or start a conversation.
            </div>
          ) : (
            <>
              <header className="shrink-0 z-10 border-b border-neutral-300 bg-neutral-50 p-4 flex items-center gap-3">
                <button
                  type="button"
                  className="md:hidden text-p text-primary p-1 hover:bg-neutral-200 rounded-full font-semibold shrink-0"
                  onClick={() => {
                    activeMessagesThreadIdRef.current = null;
                    setSelectedThreadId(null);
                    setMessages([]);
                    setLoadingMessages(false);
                  }}
                >
                  <HiChevronLeft className="size-6" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="text-h6 font-bold text-neutral-900 truncate">
                    {displayName(
                      selectedThread.customer.firstName,
                      selectedThread.customer.lastName,
                    )}
                  </h2>
                  <p className="text-sm text-neutral-600">
                    {formatPhoneNumber(selectedThread.customer.phone)}
                  </p>
                  {selectedThread.customer.smsOptedOutAt && (
                    <p className="text-sm text-amber-700 mt-1">
                      Customer opted out (STOP). They must text START to receive messages.
                    </p>
                  )}
                </div>
              </header>

              {error && mobileChatOpen && (
                <p
                  className="shrink-0 text-sm text-red-600 bg-red-50 py-2 px-4 border-b border-red-100"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div
                ref={messagesScrollRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y p-4 space-y-3"
              >
                {loadingMessages && (
                  <p className="text-p text-neutral-500 text-center">Loading messages…</p>
                )}
                {!loadingMessages && messages.length === 0 && (
                  <p className="text-p text-neutral-500 text-center">
                    No messages yet. Send the first text below.
                  </p>
                )}
                {!loadingMessages &&
                  messages.map((m) => {
                  const outbound = m.direction === "OUTBOUND";
                  const deliveryLabel = outbound ? outboundStatusLabel(m.status) : null;
                  const senderLabel =
                    outbound && m.sentBy
                      ? `${m.sentBy.firstName} ${m.sentBy.lastName}`.trim()
                      : outbound
                        ? "Automated"
                        : null;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 ${
                          outbound
                            ? "bg-primary text-neutral-100"
                            : "bg-neutral-200 text-neutral-900"
                        }`}
                      >
                        {senderLabel && (
                          <p
                            className={`text-xs mb-1 ${
                              outbound ? "text-neutral-200" : "text-neutral-500"
                            }`}
                          >
                            {senderLabel}
                          </p>
                        )}
                        <p className="text-p whitespace-pre-wrap wrap-break-word">{m.body}</p>
                        <p
                          className={`text-xs mt-1 ${
                            outbound ? "text-neutral-200/80" : "text-neutral-500"
                          }`}
                        >
                          {formatMessageTime(m.createdAt)}
                          {deliveryLabel && (
                            <>
                              {" "}
                              · {deliveryLabel}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                  })}
                <div ref={messagesEndRef} />
              </div>

              <footer className="shrink-0 z-10 border-t border-neutral-300 bg-neutral-50 p-3">
                <div className="flex gap-2">
                  <textarea
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    rows={2}
                    placeholder={
                      selectedThread.customer.smsOptedOutAt
                        ? "Customer opted out"
                        : "Type a message…"
                    }
                    disabled={sending || Boolean(selectedThread.customer.smsOptedOutAt)}
                    className="flex-1 py-2 px-3 rounded-lg resize-none text-p bg-neutral-200 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                    aria-label="Message"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={
                      sending ||
                      !composer.trim() ||
                      Boolean(selectedThread.customer.smsOptedOutAt)
                    }
                    className="self-end py-2 px-4 rounded-lg text-p font-bold bg-primary text-neutral-100 hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {sending ? "…" : "Send"}
                  </button>
                </div>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
