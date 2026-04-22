"use client";

import {
  HiChatBubbleLeftRight,
  HiPhone,
  HiUser,
} from "react-icons/hi2";
import JobAddress from "@/components/jobs/JobAddress";
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

  const contactLinkClass =
    "rounded-full bg-neutral-50 p-2 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1";

  return (
    <div className="mt-4 rounded-lg py-5 border border-neutral-300 bg-neutral-50">
      <div className="px-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-neutral-900">
          <HiUser className="size-6 shrink-0 text-neutral-900" aria-hidden />
          <h2 className="text-h6 font-bold md:text-h5">Customer</h2>
        </div>
      </div>

      <JobAddress
        layout="section"
        address={job.address}
        address2={job.address2}
        city={job.city}
        zipCode={job.zipCode}
        betweenMapAndDetails={
          <div className="flex items-center justify-between gap-x-2">
            <p className="text-h6 font-bold text-neutral-800">{customerNameDisplay}</p>
            {customerPhoneDigits ? (
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
            ) : null}
          </div>
        }
      />
    </div>
  );
}

