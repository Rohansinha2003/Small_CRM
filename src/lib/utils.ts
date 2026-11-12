export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const uid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 14);
export const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
export const waLink = (phone: string, text = "") =>
  `https://wa.me/${phone.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
export const fill = (body: string, name: string, biz = "our store") =>
  body.replace(/{{\s*name\s*}}/gi, name.split(" ")[0]).replace(/{{\s*business\s*}}/gi, biz);

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
export const dayLabel = (iso: string) => {
  const d = new Date(iso), t = new Date();
  const diff = Math.round((new Date(t.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
export const dateISO = (offsetDays = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays); return d.toISOString().slice(0, 10);
};
