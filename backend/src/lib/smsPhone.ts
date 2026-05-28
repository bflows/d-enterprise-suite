/** TCPA / carrier compliance notice sent once per customer phone (E.164). */
export const SMS_COMPLIANCE_NOTICE_BODY =
  "Duct Daddy will send job updates. HELP=Help, STOP=Stop. Msg freq varies. Msg&Data rates may apply.";

/**
 * Normalize a stored phone string toward E.164 for Twilio.
 * US-centric: bare 10 digits get +1; 11 digits starting with 1 get + prefix.
 */
export function normalizePhoneToE164(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith("+")) {
    const digits = s.slice(1).replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) {
      return `+${digits}`;
    }
    return null;
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  return null;
}

/** Compare stored customer phone to inbound E.164 (exact or US last-10 digits). */
export function phonesMatchE164(storedPhone: string, inboundE164: string): boolean {
  const normalized = normalizePhoneToE164(storedPhone);
  if (normalized === inboundE164) {
    return true;
  }
  const storedDigits = storedPhone.replace(/\D/g, "");
  const inboundDigits = inboundE164.replace(/\D/g, "");
  if (storedDigits.length >= 10 && inboundDigits.length >= 10) {
    return storedDigits.slice(-10) === inboundDigits.slice(-10);
  }
  return false;
}
