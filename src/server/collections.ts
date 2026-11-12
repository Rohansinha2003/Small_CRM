export const COLLECTIONS = ["contacts", "messages", "deals", "tasks", "templates", "broadcasts"] as const;
export type Collection = (typeof COLLECTIONS)[number];
/** Settings a client may change. `plan` is deliberately absent: it must only change via billing. */
export const WRITABLE_SETTINGS = ["businessName", "whatsappNumber", "connected", "autoReply", "autoReplyText", "sample"] as const;
export const LIMITS = { items: 1000, itemBytes: 20_000, bodyBytes: 2_000_000 };
