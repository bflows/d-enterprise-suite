"use client";

const US_COUNTRY_CODE = "+1";
const US_LOCAL_DIGITS = 10;

function getUsLocalDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("1")) return digits.slice(1, US_LOCAL_DIGITS + 1);
  return digits.slice(0, US_LOCAL_DIGITS);
}

export function formatCustomerPhoneInput(value: string): string {
  const localDigits = getUsLocalDigits(value);

  if (localDigits.length === 0) return US_COUNTRY_CODE;
  if (localDigits.length <= 3) return `${US_COUNTRY_CODE} (${localDigits}`;
  if (localDigits.length <= 6) {
    return `${US_COUNTRY_CODE} (${localDigits.slice(0, 3)}) ${localDigits.slice(3)}`;
  }
  return `${US_COUNTRY_CODE} (${localDigits.slice(0, 3)}) ${localDigits.slice(3, 6)}-${localDigits.slice(6)}`;
}

export function toUsE164Phone(value: string): string {
  return `${US_COUNTRY_CODE}${getUsLocalDigits(value)}`;
}

export function isCompleteUsPhone(value: string): boolean {
  return getUsLocalDigits(value).length === US_LOCAL_DIGITS;
}

interface CustomerPhoneProps {
  value: string;
  onChange: (value: string) => void;
  borderClassName: string;
}

export default function CustomerPhone({
  value,
  onChange,
  borderClassName,
}: CustomerPhoneProps) {
  const displayValue = value || US_COUNTRY_CODE;
  const isDefaultValue = displayValue === US_COUNTRY_CODE;

  return (
    <div>
      <label htmlFor="customer-phone" className="text-neutral-800 text-sm">
        Phone <span className="text-red-600">*</span>
      </label>
      <input
        id="customer-phone"
        type="tel"
        autoComplete="tel"
        required
        value={displayValue}
        onChange={(e) => onChange(formatCustomerPhoneInput(e.target.value))}
        className={`mt-1 w-full rounded-lg border ${borderClassName} bg-neutral-50 px-3 py-2 text-p ${isDefaultValue ? "text-neutral-400" : "text-neutral-800"} focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
        placeholder="+1 (123) 456-7890"
      />
    </div>
  );
}
