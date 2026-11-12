import type { DB, Contact, Message, Deal, Stage } from "./types";
import { dateISO } from "./utils";

const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();

export function seed(): DB {
  const team = [
    { id: "t1", name: "Priya Sharma", role: "Owner" as const, color: "#16a34a" },
    { id: "t2", name: "Arjun Mehta", role: "Agent" as const, color: "#0ea5e9" },
  ];
  const c = (id: string, name: string, phone: string, company: string, tags: string[], status: Contact["status"], source: string, notes: string, owner: string, created: number, last: number): Contact => ({
    id, name, phone, company, tags, status, source, notes, owner,
    email: name.toLowerCase().replace(/[^a-z]/g, ".").replace(/\.+/g, ".") + "@example.com",
    createdAt: ago(created), lastContactAt: ago(last),
  });
  const contacts: Contact[] = [
    c("c1", "Rahul Verma", "+919810012345", "Verma Interiors", ["VIP", "Interior"], "customer", "Instagram", "Repeat buyer. Prefers calls after 6pm.", "t1", 60 * 24 * 90, 12),
    c("c2", "Sneha Kapoor", "+919820098765", "Kapoor Boutique", ["Wholesale"], "lead", "WhatsApp link", "Asked for the wholesale catalogue.", "t1", 60 * 24 * 6, 35),
    c("c3", "Mohammed Iqbal", "+919845011223", "Iqbal Traders", ["Wholesale", "VIP"], "customer", "Referral", "Pays on 15-day credit.", "t2", 60 * 24 * 120, 60 * 5),
    c("c4", "Ananya Iyer", "+919900155667", "", ["Retail"], "lead", "Facebook ad", "Interested in the festive combo.", "t2", 60 * 24 * 2, 4),
    c("c5", "Vikram Singh", "+919712233445", "Singh Events", ["Events"], "lead", "Walk-in", "Planning a wedding order for 200 pax.", "t1", 60 * 24 * 10, 60 * 26),
    c("c6", "Deepa Nair", "+919633087654", "Nair Naturals", ["Retail", "Repeat"], "customer", "Instagram", "Orders monthly.", "t2", 60 * 24 * 200, 60 * 48),
    c("c7", "Karan Malhotra", "+919876543210", "KM Gym", ["Corporate"], "lead", "Website form", "Wants a bulk quote for members.", "t1", 60 * 24 * 4, 60 * 8),
    c("c8", "Fatima Sheikh", "+919892211334", "", ["Retail"], "customer", "WhatsApp link", "", "t2", 60 * 24 * 40, 60 * 24 * 3),
    c("c9", "Rohit Gupta", "+919818877665", "Gupta & Sons", ["Wholesale"], "inactive", "Referral", "Went quiet after the quote.", "t1", 60 * 24 * 150, 60 * 24 * 40),
    c("c10", "Lakshmi Reddy", "+919848012345", "Reddy Catering", ["Events", "VIP"], "lead", "Instagram", "Needs delivery in Hyderabad.", "t2", 60 * 24 * 3, 60 * 3),
    c("c11", "Amit Patel", "+919825099887", "Patel Mart", ["Wholesale"], "customer", "Referral", "Monthly standing order.", "t1", 60 * 24 * 220, 60 * 24 * 2),
    c("c12", "Neha Joshi", "+919422011009", "", ["Retail"], "lead", "Facebook ad", "Asked about COD.", "t2", 60 * 24, 20),
  ];

  let n = 0;
  const m = (contactId: string, dir: "in" | "out", text: string, minAgo: number, by?: string): Message => ({
    id: "m" + ++n, contactId, dir, text, at: ago(minAgo),
    status: dir === "out" ? (minAgo < 30 ? "delivered" : "read") : undefined, by,
  });
  const messages: Message[] = [
    m("c1", "in", "Hi, is the oak console table back in stock?", 190),
    m("c1", "out", "Hi Rahul! Yes, 4 pieces arrived this morning. Want me to hold one?", 170, "t1"),
    m("c1", "in", "Please hold one. Will pay by evening.", 40),
    m("c1", "in", "Can you share the UPI details?", 12),
    m("c2", "in", "Hello, I saw your catalogue on Instagram. Do you do wholesale pricing?", 120),
    m("c2", "out", "Hi Sneha, yes! Minimum order is 20 pieces. Sending the catalogue now.", 100, "t1"),
    m("c2", "in", "Great, what's the best price for 50 pieces?", 35),
    m("c3", "out", "Assalamualaikum Iqbal bhai, your order #1042 is ready for dispatch.", 60 * 6, "t2"),
    m("c3", "in", "Thanks! Send it tomorrow morning please.", 60 * 5),
    m("c4", "in", "Hi! Is the festive combo still available?", 25),
    m("c4", "in", "Also do you deliver to Bengaluru?", 4),
    m("c5", "out", "Hi Vikram, here's the quote for 200 pax: ₹1,85,000. Valid for 7 days.", 60 * 30, "t1"),
    m("c5", "in", "Let me discuss with the family and revert.", 60 * 26),
    m("c6", "out", "Hi Deepa, your monthly refill is due. Shall I repeat last order?", 60 * 50, "t2"),
    m("c6", "in", "Yes please, same as before 🙏", 60 * 48),
    m("c7", "in", "We need 60 shaker bottles with logo. What's the rate?", 60 * 9),
    m("c7", "out", "Hi Karan, ₹240 per piece with logo printing. Sharing the proof soon.", 60 * 8, "t1"),
    m("c8", "out", "Thank you for your order, Fatima! 🎉", 60 * 24 * 3, "t2"),
    m("c9", "out", "Hi Rohit, just checking if you had a chance to review our quote?", 60 * 24 * 40, "t1"),
    m("c10", "in", "Do you deliver to Hyderabad? I need 80 boxes by Saturday.", 60 * 3 + 10),
    m("c10", "out", "Yes Lakshmi, delivery is ₹400 flat. Confirming stock now.", 60 * 3, "t2"),
    m("c11", "out", "Hi Amit, your standing order is dispatched. Tracking: DL99281.", 60 * 24 * 2, "t1"),
    m("c12", "in", "Is cash on delivery available?", 20),
  ];

  const d = (id: string, contactId: string, title: string, value: number, stage: Stage, days: number): Deal => ({
    id, contactId, title, value, stage, createdAt: ago(60 * 24 * days),
    closedAt: stage === "won" || stage === "lost" ? ago(60 * 24 * Math.max(days - 3, 0)) : undefined,
  });
  const deals: Deal[] = [
    d("d1", "c1", "Oak console table", 28000, "negotiation", 2),
    d("d2", "c2", "Wholesale – 50 pcs", 62000, "quoted", 5),
    d("d3", "c4", "Festive combo", 3200, "new", 1),
    d("d4", "c5", "Wedding order – 200 pax", 185000, "quoted", 8),
    d("d5", "c7", "Branded bottles – 60 pcs", 14400, "contacted", 3),
    d("d6", "c10", "Catering boxes – 80", 56000, "negotiation", 2),
    d("d7", "c3", "Bulk order #1042", 95000, "won", 8),
    d("d8", "c6", "Monthly refill", 7800, "won", 4),
    d("d9", "c11", "Standing order – Nov", 42000, "won", 2),
    d("d10", "c8", "Gift hamper", 4500, "won", 5),
    d("d11", "c9", "Wholesale – 100 pcs", 120000, "lost", 40),
    d("d12", "c12", "Starter pack", 2400, "new", 1),
    d("d13", "c1", "Dining chairs x6", 36000, "won", 20),
  ];

  const tasks = [
    { id: "k1", contactId: "c1", title: "Send UPI details & confirm held console table", due: dateISO(0), done: false, assignee: "t1" },
    { id: "k2", contactId: "c2", title: "Quote 50 pcs wholesale pricing", due: dateISO(0), done: false, assignee: "t1" },
    { id: "k3", contactId: "c5", title: "Follow up on wedding quote (valid till Friday)", due: dateISO(1), done: false, assignee: "t1" },
    { id: "k4", contactId: "c7", title: "Share logo proof for shaker bottles", due: dateISO(-1), done: false, assignee: "t2" },
    { id: "k5", contactId: "c9", title: "Win-back message with 10% offer", due: dateISO(3), done: false, assignee: "t1" },
    { id: "k6", contactId: "c10", title: "Confirm stock for 80 boxes", due: dateISO(0), done: true, assignee: "t2" },
    { id: "k7", title: "Update festive price list", due: dateISO(2), done: false, assignee: "t2" },
  ];

  const templates = [
    { id: "p1", name: "Welcome", category: "Greeting" as const, body: "Hi {{name}}, thanks for reaching out to {{business}}! How can we help you today?" },
    { id: "p2", name: "Quote follow-up", category: "Follow-up" as const, body: "Hi {{name}}, just checking if you had a chance to review our quote. Happy to answer any questions!" },
    { id: "p3", name: "Payment details", category: "Payment" as const, body: "Hi {{name}}, you can pay via UPI to pay@chatdesk. Please share the screenshot once done. Thank you! 🙏" },
    { id: "p4", name: "Festive offer", category: "Offer" as const, body: "Hi {{name}}! 🎉 Our festive sale is live — flat 15% off till Sunday. Reply YES and we'll send the catalogue." },
    { id: "p5", name: "Order dispatched", category: "Support" as const, body: "Hi {{name}}, your order has been dispatched and will reach you in 2–3 days. We'll share tracking shortly." },
    { id: "p6", name: "Win-back", category: "Follow-up" as const, body: "Hi {{name}}, it's been a while! Here's 10% off your next order as a thank you. Valid for 7 days." },
  ];

  const broadcasts = [
    { id: "b1", name: "Diwali offer", body: templates[3].body, audience: "All customers", recipients: 148, delivered: 144, read: 121, replied: 37, at: ago(60 * 24 * 12) },
    { id: "b2", name: "Monthly refill reminder", body: "Hi {{name}}, your monthly refill is due. Reply to repeat your last order.", audience: "Tag: Repeat", recipients: 42, delivered: 42, read: 38, replied: 19, at: ago(60 * 24 * 5) },
  ];

  return {
    contacts, messages, deals, tasks, templates, broadcasts, team,
    settings: {
      businessName: "Sharma Home & Gifts", whatsappNumber: "+91 98100 55555", connected: true,
      autoReply: true, autoReplyText: "Thanks for messaging Sharma Home & Gifts! We'll reply within 15 minutes (10am–8pm).",
      plan: "Starter",
    },
  };
}
