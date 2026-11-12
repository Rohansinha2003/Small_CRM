export type Status = "lead" | "customer" | "inactive";
export type Stage = "new" | "contacted" | "quoted" | "negotiation" | "won" | "lost";

export interface TeamMember { id: string; name: string; role: "Owner" | "Admin" | "Agent"; color: string; email?: string }
export interface Contact {
  id: string; name: string; phone: string; email?: string; company?: string;
  tags: string[]; status: Status; source: string; notes: string;
  owner: string; createdAt: string; lastContactAt: string;
}
export interface Message {
  id: string; contactId: string; dir: "in" | "out"; text: string; at: string;
  status?: "sent" | "delivered" | "read"; by?: string;
}
export interface Deal { id: string; contactId: string; title: string; value: number; stage: Stage; createdAt: string; closedAt?: string }
export interface Task { id: string; contactId?: string; title: string; due: string; done: boolean; assignee: string }
export interface Template { id: string; name: string; category: "Greeting" | "Follow-up" | "Offer" | "Payment" | "Support"; body: string }
export interface Broadcast {
  id: string; name: string; body: string; audience: string; recipients: number;
  delivered: number; read: number; replied: number; at: string;
}
export interface Settings {
  businessName: string; whatsappNumber: string; connected: boolean;
  autoReply: boolean; autoReplyText: string; plan: "Free" | "Starter" | "Growth"; sample?: boolean;
}
export interface DB {
  contacts: Contact[]; messages: Message[]; deals: Deal[]; tasks: Task[];
  templates: Template[]; broadcasts: Broadcast[]; team: TeamMember[]; settings: Settings;
}

export const STAGES: { id: Stage; label: string; color: string }[] = [
  { id: "new", label: "New enquiry", color: "#64748b" },
  { id: "contacted", label: "Contacted", color: "#0ea5e9" },
  { id: "quoted", label: "Quote sent", color: "#8b5cf6" },
  { id: "negotiation", label: "Negotiation", color: "#f59e0b" },
  { id: "won", label: "Won", color: "#16a34a" },
  { id: "lost", label: "Lost", color: "#ef4444" },
];
