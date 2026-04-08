"use client";

import Link from "next/link";
import {
  HiChatBubbleLeftRight,
  HiPhone,
  HiUser,
} from "react-icons/hi2";
import { HiLocationMarker } from "react-icons/hi";
import JobStreetView from "@/components/schedule/JobStreetView";
import { formatJobAddress } from "@/lib/formatJobAddress";
import type { Job } from "@/lib/calendar/types";

export interface JobCustomerProps {
  job: Job;
}

function phoneDigitsForLinks(phone: string): string {
  return phone.replace(/\D/g, "");
}

export default function JobCustomer({ job }: JobCustomerProps) {
  const customerNameDisplay =
    [job.customerFirstName, job.customerLastName].filter(Boolean).join(" ").trim() ||
    job.customerName ||
    "—";

  const customerPhoneDigits = job.customerPhone
    ? phoneDigitsForLinks(job.customerPhone)
    : "";

  const jobAddressLine = formatJobAddress(job);

  const contactLinkClass =
    "rounded-full bg-neutral-50 p-2 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1";

  return (
    <div className="rounded-lg py-5 border border-neutral-300 bg-neutral-50">
      <div className="px-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-neutral-900">
          <HiUser className="size-6 shrink-0 text-neutral-900" aria-hidden />
          <h2 className="text-h6 font-bold md:text-h5">Customer</h2>
        </div>
      </div>

      <div className="mt-4">
        {jobAddressLine ? (
          <JobStreetView
            key={`${job.address ?? ""}|${job.address2 ?? ""}|${job.city ?? ""}|${job.zipCode ?? ""}`}
            labelAddress={jobAddressLine}
            street={job.address}
            address2={job.address2}
            city={job.city}
            zipCode={job.zipCode}
          />
        ) : null}

        <div className="mt-2 px-4 flex items-center justify-between gap-x-2">
          <p className="text-h6 font-bold text-neutral-800">{customerNameDisplay}</p>
          {customerPhoneDigits && (
            <div className="flex flex-wrap gap-2">
              <a
                href={`sms:${customerPhoneDigits}`}
                className={`${contactLinkClass} bg-neutral-200/50 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-800`}
              >
                <HiChatBubbleLeftRight className="size-6 shrink-0" aria-hidden />
              </a>
              <a
                href={`tel:${customerPhoneDigits}`}
                className={`${contactLinkClass} bg-primary/90 text-neutral-200 hover:text-neutral-100 hover:bg-primary`}
              >
                <HiPhone className="size-6 shrink-0" aria-hidden />
              </a>
            </div>
          )}
        </div>

        {job.address ? (
          <div className="mt-2 px-4 flex items-start gap-x-2">
            <div>
              <HiLocationMarker className="size-8 text-primary" />
            </div>
            <div>
              <Link
                href={`https://www.google.com/maps/place/${job.address}`}
                target="_blank"
                className="text-p underline transition-colors duration-300 ease-in-out text-neutral-600 hover:text-primary"
              >
                {job.address}
              </Link>
              <p className="text-small text-neutral-800">
                {job.city?.trim() ? job.city : "—"}, {job.zipCode?.trim() ? job.zipCode : "—"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-neutral-500">—</p>
        )}
      </div>
    </div>
  );
}

