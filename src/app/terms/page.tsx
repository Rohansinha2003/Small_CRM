import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { COMPANY as C } from "@/lib/company";
export const metadata: Metadata = { title: "Terms of Service — ChatDesk" };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>These terms govern your use of {C.name} (the &ldquo;Service&rdquo;), operated by {C.legalName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account you agree to them.</p>
      <h2>1. The Service</h2><p>{C.name} is a customer-relationship tool that helps small teams organise contacts, conversations, deals and follow-ups. It is not affiliated with or endorsed by WhatsApp or Meta. You remain responsible for complying with WhatsApp&apos;s terms and policies when messaging your customers.</p>
      <h2>2. Accounts</h2><ul><li>You must provide accurate information and keep your password confidential.</li><li>The workspace owner is responsible for activity by teammates they invite.</li><li>You must be at least 18 years old and able to enter a binding contract.</li></ul>
      <h2>3. Your data</h2><p>You own the data you put into the Service. You grant us a limited licence to host and process it solely to provide the Service. You are responsible for having the right to store your customers&apos; information, including any consent required to contact them. You can export or delete your data at any time from the Team &amp; admin page.</p>
      <h2>4. Acceptable use</h2><p>Do not use the Service to send spam or unlawful, deceptive or harassing messages, to infringe others&apos; rights, to attempt unauthorised access, or to disrupt the Service. We may suspend workspaces that breach these terms.</p>
      <h2>5. Plans, billing and renewal</h2><p>Paid plans are prepaid for the period purchased (monthly or yearly) and are not automatically renewed. Prices are in Indian Rupees and exclusive of applicable taxes. Payments are processed by Razorpay. When a paid period ends, the workspace returns to the Free plan; your data is retained but plan limits apply to new additions. See our <a className="text-brand underline" href="/refund">Refund &amp; Cancellation Policy</a>.</p>
      <h2>6. Availability</h2><p>We aim for high availability but do not guarantee uninterrupted service. We may modify or discontinue features with reasonable notice.</p>
      <h2>7. Disclaimer and liability</h2><p>The Service is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law, we are not liable for indirect or consequential losses, and our total liability for any claim is limited to the fees you paid in the 3 months before the claim.</p>
      <h2>8. Termination</h2><p>You may stop using the Service at any time. We may suspend or terminate accounts that breach these terms or are used unlawfully.</p>
      <h2>9. Governing law</h2><p>These terms are governed by the laws of India. Courts at the location of our registered office have exclusive jurisdiction.</p>
      <h2>10. Contact</h2><p>{C.legalName}, {C.address}. Email: {C.email}.</p>
    </LegalPage>
  );
}
