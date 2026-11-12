"use client";
import { useEffect } from "react";
import { cn, initials } from "@/lib/utils";

export function Button({ variant = "primary", size = "md", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger"; size?: "sm" | "md" }) {
  return (
    <button {...p} className={cn(
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
      size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm",
      variant === "primary" && "bg-brand text-white hover:bg-brand-dark",
      variant === "outline" && "border border-line bg-card hover:bg-brand-soft",
      variant === "ghost" && "hover:bg-brand-soft text-foreground",
      variant === "danger" && "text-red-600 hover:bg-red-500/10",
      className)} />
  );
}
export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div {...p} className={cn("rounded-xl border border-line bg-card", className)} />;

export const Input = ({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) =>
  <input {...p} className={cn("w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/40", className)} />;
export const Textarea = ({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) =>
  <textarea {...p} className={cn("w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/40", className)} />;
export const Select = ({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) =>
  <select {...p} className={cn("w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/40", className)} />;
export const Field = ({ label, children }: { label: string; children: React.ReactNode }) =>
  <label className="block"><span className="mb-1 block text-xs font-medium text-muted">{label}</span>{children}</label>;

export function Badge({ children, color, className }: { children: React.ReactNode; color?: string; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", !color && "bg-brand-soft text-brand", className)}
    style={color ? { background: color + "22", color } : undefined}>{children}</span>;
}
export function Avatar({ name, color, size = 36 }: { name: string; color?: string; size?: number }) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return <div className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
    style={{ width: size, height: size, fontSize: size * 0.38, background: color ?? `hsl(${hue} 45% 42%)` }}>{initials(name)}</div>;
}
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={cn("pop max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-card p-5 shadow-2xl sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted hover:bg-brand-soft">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
export const PageHeader = ({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{sub && <p className="text-sm text-muted">{sub}</p>}</div>
    <div className="flex flex-wrap gap-2">{actions}</div>
  </div>
);
export const Empty = ({ text }: { text: string }) => <div className="py-12 text-center text-sm text-muted">{text}</div>;
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex items-center justify-center rounded-lg bg-brand text-white" style={{ width: size, height: size }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 13.9c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.1.1.3 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.900 1.200 2.200 1.300.3.1.4.100.600-.1l.8-1c.2-.2.4-.2.6-.1l1.900.9c.3.1.5.2.5.3.1.2.1.700-.1 1.300Z"/></svg>
      </span>
      ChatDesk
    </span>
  );
}
