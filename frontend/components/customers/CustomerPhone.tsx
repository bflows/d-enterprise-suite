"use client";

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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full rounded-lg border ${borderClassName} bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
        placeholder="(555) 123-4567"
      />
    </div>
  );
}
