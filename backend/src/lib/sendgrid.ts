import sgMail from "@sendgrid/mail";

let apiKeyApplied = false;

/**
 * SendGrid is optional at runtime. When `SENDGRID_API_KEY` is set (e.g. Heroku config vars),
 * the client is configured on first use.
 */
export function ensureSendGridConfigured(): boolean {
  const key = process.env.SENDGRID_API_KEY?.trim();
  if (!key) {
    return false;
  }
  if (!apiKeyApplied) {
    sgMail.setApiKey(key);
    apiKeyApplied = true;
  }
  return true;
}

export function getSendGridFrom(): { email: string; name: string } | null {
  const email = process.env.SENDGRID_FROM_EMAIL?.trim();
  if (!email) {
    return null;
  }
  const name = process.env.SENDGRID_FROM_NAME?.trim() || "Duct Daddy";
  return { email, name };
}

export { sgMail };
