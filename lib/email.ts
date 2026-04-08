const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "noreply@wemoveny.app";
const REPLY_TO = process.env.EMAIL_REPLY_TO;

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html, ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Email send failed: ${text}`);
  }
}
