import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { COMPANY as C } from "@/lib/company";
export const metadata: Metadata = { title: "Privacy Policy — ChatDesk" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>This policy explains what {C.legalName} (&ldquo;{C.name}&rdquo;) collects and how we use it.</p>
      <h2>What we collect</h2>
      <ul><li><b>Account data:</b> your name, email, business name and a salted hash of your password.</li><li><b>Workspace data you enter:</b> contacts, messages, deals, tasks, templates and settings. Your customers&apos; details belong to you; we process them on your behalf.</li><li><b>Billing data:</b> plan, amount and Razorpay payment/order IDs. We never see or store your card, UPI or bank details — those go directly to Razorpay.</li><li><b>Technical data:</b> IP address and request logs for security and rate limiting; a session cookie to keep you signed in.</li></ul>
      <h2>How we use it</h2><p>To provide and secure the Service, process payments, provide support, and meet legal obligations. We do not sell personal data and do not use your workspace data for advertising.</p>
      <h2>Sharing</h2><p>We share data only with service providers needed to run the Service (hosting, database, Razorpay for payments), or where required by law.</p>
      <h2>Security</h2><p>Passwords are hashed; sessions use HttpOnly cookies; data is encrypted in transit; workspaces are logically isolated. No system is perfectly secure, so please use a strong, unique password.</p>
      <h2>Retention and deletion</h2><p>We keep your data while your account is active. Owners can export all data and permanently delete their workspace from Team &amp; admin; deletion removes workspace data from our database (backups expire on the provider&apos;s normal schedule).</p>
      <h2>Your rights</h2><p>You may access, correct, export or delete your data, and withdraw consent, by using the in-app tools or emailing {C.email}.</p>
      <h2>Your customers&apos; data</h2><p>You are responsible for having a lawful basis (such as consent) to store and message your customers. Please contact us for a data-processing agreement if you need one.</p>
      <h2>Changes &amp; contact</h2><p>We may update this policy and will change the date above. Questions: {C.email}, {C.address}.</p>
    </LegalPage>
  );
}
