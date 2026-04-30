const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "noreply@wemoveny.app";
const REPLY_TO = process.env.EMAIL_REPLY_TO;

export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");

  // If no plaintext provided, generate a basic version from the HTML.
  // Mail clients and spam filters favor multipart messages — sending HTML-only
  // (especially from a new domain) significantly increases the chance of
  // landing in spam, particularly with AOL/Yahoo/Outlook.
  const plainText = text ?? htmlToPlainText(html);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      text: plainText,
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Email send failed: ${text}`);
  }
}

// Bare-bones HTML to plaintext: strip tags, decode a few entities, collapse whitespace.
// Good enough for transactional emails. For richer conversion, callers can pass `text`.
function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(p|div|h[1-6]|li)\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
