// Set these in the environment BEFORE building (they are baked into the static legal pages).
export const COMPANY = {
  name: process.env.COMPANY_NAME ?? "ChatDesk",
  legalName: process.env.COMPANY_LEGAL_NAME ?? "ChatDesk (replace with your registered business name)",
  email: process.env.SUPPORT_EMAIL ?? "support@example.com",
  phone: process.env.SUPPORT_PHONE ?? "+91 00000 00000",
  address: process.env.COMPANY_ADDRESS ?? "Your registered business address, India",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://chatdesk.example",
  updated: "7 November 2026",
};
