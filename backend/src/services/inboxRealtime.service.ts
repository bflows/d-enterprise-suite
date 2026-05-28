import { EventEmitter } from "node:events";

export type InboxRealtimeEvent =
  | { type: "message.created"; companyId: string; threadId: string; messageId: string }
  | { type: "message.status"; companyId: string; threadId: string; messageId: string }
  | { type: "thread.updated"; companyId: string; threadId: string };

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

export function subscribeInboxEvents(
  companyId: string,
  listener: (event: InboxRealtimeEvent) => void,
): () => void {
  const handler = (event: InboxRealtimeEvent) => {
    if (event.companyId === companyId) {
      listener(event);
    }
  };
  emitter.on("inbox", handler);
  return () => emitter.off("inbox", handler);
}

export function publishInboxEvent(event: InboxRealtimeEvent): void {
  emitter.emit("inbox", event);
}
