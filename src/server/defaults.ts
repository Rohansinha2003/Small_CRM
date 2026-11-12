import type { Template } from "@/lib/types";

export const DEFAULT_TEMPLATES: Template[] = [
  { id: "p1", name: "Welcome", category: "Greeting", body: "Hi {{name}}, thanks for reaching out to {{business}}! How can we help you today?" },
  { id: "p2", name: "Quote follow-up", category: "Follow-up", body: "Hi {{name}}, just checking if you had a chance to review our quote. Happy to answer any questions!" },
  { id: "p3", name: "Payment details", category: "Payment", body: "Hi {{name}}, you can pay via UPI. Please share the screenshot once done. Thank you! 🙏" },
  { id: "p4", name: "Order dispatched", category: "Support", body: "Hi {{name}}, your order has been dispatched and will reach you in 2–3 days." },
];
export const DEFAULT_SETTINGS = (businessName: string) => ({
  businessName, whatsappNumber: "", connected: false, autoReply: false,
  autoReplyText: `Thanks for messaging ${businessName}! We'll get back to you shortly.`, plan: "Free",
});
