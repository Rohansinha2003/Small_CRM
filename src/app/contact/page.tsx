import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { COMPANY as C } from "@/lib/company";
export const metadata: Metadata = { title: "Contact — ChatDesk" };

export default function Contact() {
  return (
    <LegalPage title="Contact us">
      <p>We&apos;re a small team and read every message.</p>
      <ul><li><b>Email:</b> <a className="text-brand underline" href={`mailto:${C.email}`}>{C.email}</a></li><li><b>Phone:</b> {C.phone}</li><li><b>Registered address:</b> {C.address}</li><li><b>Business:</b> {C.legalName}</li></ul>
      <p>For billing issues, include your workspace name and Razorpay payment ID. We aim to reply within one business day.</p>
    </LegalPage>
  );
}
