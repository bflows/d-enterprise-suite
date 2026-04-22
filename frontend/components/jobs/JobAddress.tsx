"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { HiLocationMarker } from "react-icons/hi";
import JobStreetView from "@/components/schedule/JobStreetView";
import { formatJobAddress, type JobAddressFields } from "@/lib/formatJobAddress";

export type JobAddressProps = JobAddressFields & {
  /**
   * `page` — bordered card with optional heading (customer detail, etc.).
   * `section` — map + details only, for use inside a larger card (e.g. job customer block).
   */
  layout: "page" | "section";
  showHeading?: boolean;
  betweenMapAndDetails?: ReactNode;
};

function AddressDetails({
  address,
  address2,
  city,
  zipCode,
}: JobAddressFields) {
  const line1 = address?.trim() ?? "";
  const line2 = address2?.trim() ?? "";
  const cityZip = [city, zipCode]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((s) => s !== "");
  const cityZipLine = cityZip.join(", ");
  const hasAny = line1 !== "" || line2 !== "" || cityZipLine !== "";

  if (!hasAny) {
    return <p className="text-p text-neutral-500">—</p>;
  }

  return (
    <div className="flex items-start gap-x-2">
      <div>
        <HiLocationMarker className="size-8 text-primary" aria-hidden />
      </div>
      <div>
        {line1 ? (
          <Link
            href={`https://www.google.com/maps/place/${encodeURIComponent(line1)}`}
            target="_blank"
            className="text-p underline transition-colors duration-300 ease-in-out text-neutral-600 hover:text-primary"
          >
            {line1}
          </Link>
        ) : null}
        {line2 ? <p className="text-p text-neutral-800">{line2}</p> : null}
        {cityZipLine ? (
          <p className="mt-1 text-small text-neutral-800">{cityZipLine}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function JobAddress({
  address,
  address2,
  city,
  zipCode,
  layout,
  showHeading = layout === "page",
  betweenMapAndDetails,
}: JobAddressProps) {
  const label = formatJobAddress({ address, address2, city, zipCode });
  const key = [address, address2, city, zipCode].map((s) => s ?? "").join("|");
  const street = address ?? undefined;
  const viewCity = city ?? undefined;
  const viewZip = zipCode ?? undefined;

  const hasUpper = Boolean(label) || Boolean(betweenMapAndDetails);
  const detailsTopClass =
    layout === "page" && !hasUpper && showHeading ? "mt-4" : "mt-2";
  const detailsBoxClass =
    layout === "page"
      ? `${detailsTopClass} px-4 pb-4 text-p text-neutral-800`
      : `${detailsTopClass} px-4 text-p text-neutral-800`;

  if (layout === "section") {
    return (
      <div className="mt-4">
        {label ? (
          <JobStreetView
            key={key}
            labelAddress={label}
            street={street}
            city={viewCity}
            zipCode={viewZip}
          />
        ) : null}
        {betweenMapAndDetails ? (
          <div className="mt-2 px-4">{betweenMapAndDetails}</div>
        ) : null}
        <div className={detailsBoxClass}>
          <AddressDetails address={address} address2={address2} city={city} zipCode={zipCode} />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-neutral-300 bg-neutral-50">
      {showHeading ? (
        <div className="flex items-center gap-x-2 px-4 pt-4">
          <HiLocationMarker className="size-6 text-neutral-900" aria-hidden />
          <h2 className="text-h6 font-bold text-neutral-900">Address</h2>
        </div>
      ) : null}
      {label ? (
        <div className={showHeading ? "mt-4" : "mt-0"}>
          <JobStreetView
            key={key}
            labelAddress={label}
            street={street}
            city={viewCity}
            zipCode={viewZip}
          />
        </div>
      ) : null}
      {betweenMapAndDetails ? (
        <div className="mt-2 px-4">{betweenMapAndDetails}</div>
      ) : null}
      <div className={detailsBoxClass}>
        <AddressDetails address={address} address2={address2} city={city} zipCode={zipCode} />
      </div>
    </div>
  );
}
