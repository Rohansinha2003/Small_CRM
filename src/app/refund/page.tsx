import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { COMPANY as C } from "@/lib/company";
export const metadata: Metadata = { title: "Refund & Cancellation Policy — ChatDesk" };

export default function Refund() {
  return (
    <LegalPage title="Refund & Cancellation Policy">
      <h2>Cancellation</h2><p>Plans are prepaid and do not auto-renew, so there is nothing to cancel: if you do not renew, your workspace simply returns to the Free plan when the paid period ends. Your data is kept.</p>
      <h2>Refunds</h2><ul><li>If you are charged in error, or charged twice for the same order, we will refund the extra amount in full.</li><li>If you are unhappy within <b>7 days</b> of your first purchase of a paid plan, email us and we will refund that payment.</li><li>After 7 days, payments for a period already in use are non-refundable, but you keep access until the period ends.</li></ul>
      <h2>How refunds are processed</h2><p>Approved refunds are issued to the original payment method through Razorpay and typically reach you within 5–7 business days, depending on your bank.</p>
      <h2>Request a refund</h2><p>Email {C.email} from your account email with your workspace name and Razorpay payment ID (shown under Plan &amp; billing → Payment history).</p>
    </LegalPage>
  );
}
