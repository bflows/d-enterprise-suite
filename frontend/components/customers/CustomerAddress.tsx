import { HiLocationMarker } from "react-icons/hi";
import type { CustomerDetail } from "@/lib/api/customers";
import Link from "next/link";

export type CustomerAddressProps = Pick<
  CustomerDetail,
  "address" | "address2" | "city" | "zipCode"
>;

export default function CustomerAddress({
  address,
  address2,
  city,
  zipCode,
}: CustomerAddressProps) {
  const cityZip = [city, zipCode].filter((s) => s != null && String(s).trim() !== "").join(", ");
  const hasAny =
    (address && address.trim() !== "") ||
    (address2 && address2.trim() !== "") ||
    cityZip !== "";

  return (
    <div className="mt-4 p-4 rounded-lg border border-neutral-300 bg-neutral-50">
      <div className="flex items-center gap-x-2">
        <div>
          <HiLocationMarker className="size-6 text-neutral-900" />
        </div>
        <h2 className="text-h6 font-bold text-neutral-900">Address</h2>
      </div>

      <div className="mt-4 text-p text-neutral-800">
        {!hasAny ? (
          <p className="text-neutral-500">—</p>
        ) : (
          <>
            {address?.trim() ? <Link href={`https://www.google.com/maps/place/${address}`} target="_blank" className="text-p underline text-primary">
              {address}
            </Link> : null}
            {address2?.trim() ? <p className="text-p text-neutral-800">{address2}</p> : null}
            {cityZip ? <p className="mt-1 text-small text-neutral-800">{cityZip}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}