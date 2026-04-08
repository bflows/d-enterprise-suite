"use client";

import RequireRole from "@/components/auth/RequireRole";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { getCustomerDetails } from "@/lib/api/customers";
import type { CustomerDetail } from "@/lib/api/customers";
import { ROLE_SLUGS } from "@/types/auth";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { LuArrowLeft } from "react-icons/lu";
import type { AxiosError } from "axios";

function displayName(c: Pick<CustomerDetail, "firstName" | "lastName">) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-wrap gap-x-2 py-2 border-b border-neutral-200 last:border-b-0">
      <dt className="text-neutral-500 text-sm shrink-0 min-w-28">{label}</dt>
      <dd className="text-neutral-900 text-p wrap-break-word">{value}</dd>
    </div>
  );
}

function CustomerDetailInner() {
  const params = useParams();
  const customerId = typeof params?.customerId === "string" ? params.customerId : "";
  const companyId = useSelector((state: RootState) => selectCurrentCompanyId(state));

  const canFetch = Boolean(customerId && companyId);

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canFetch) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setFetchLoading(true);
      setError(null);
      setCustomer(null);
      void getCustomerDetails(companyId!, customerId!)
        .then((res) => {
          if (!cancelled) setCustomer(res.customer);
        })
        .catch((err: AxiosError<{ message?: string }>) => {
          if (cancelled) return;
          setCustomer(null);
          const msg =
            err.response?.data?.message ??
            (err.response?.status === 404 ? "Customer not found" : null) ??
            err.message ??
            "Failed to load customer";
          setError(msg);
        })
        .finally(() => {
          if (!cancelled) setFetchLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [canFetch, companyId, customerId]);

  if (!companyId) {
    return (
      <p className="text-neutral-600 text-p mt-6">Select a company to view this customer.</p>
    );
  }

  if (!customerId) {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-neutral-600 text-p">Invalid customer</p>
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
        >
          <LuArrowLeft className="size-5" />
          Back to customers
        </Link>
      </div>
    );
  }

  const loading = canFetch && fetchLoading;

  if (loading) {
    return (
      <div className="mt-10 flex justify-center min-h-30 items-center">
        <div className="text-center">
          <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <p className="text-neutral-800 text-p mt-2">Loading customer...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-neutral-600 text-p">{error ?? "Customer not found"}</p>
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
        >
          <LuArrowLeft className="size-5" />
          Back to customers
        </Link>
      </div>
    );
  }

  const name = displayName(customer);

  return (
    <div>
      <Link
        href="/customers"
        className="hidden items-center gap-2 text-primary font-medium hover:underline sm:inline-flex"
      >
        <LuArrowLeft className="size-5" />
        Back to customers
      </Link>

      <div className="bg-neutral-50 border border-neutral-400 rounded-lg p-4 sm:p-6 shadow-sm">
        <h1 className="text-neutral-900 text-h5 font-bold">{name}</h1>
        <p className="text-neutral-700 text-p mt-2">
          <a href={`tel:${customer.phone}`} className="hover:text-primary underline">
            {customer.phone}
          </a>
        </p>

        <dl className="mt-6">
          <DetailRow label="Email" value={customer.email} />
          <DetailRow label="Address" value={customer.address} />
          <DetailRow label="Address line 2" value={customer.address2} />
          <DetailRow label="City" value={customer.city} />
          <DetailRow label="ZIP" value={customer.zipCode} />
          <DetailRow label="Company name" value={customer.companyName} />
          <DetailRow label="Lead source" value={customer.leadSource} />
          {customer.notes ? (
            <div className="py-2 border-b border-neutral-200 last:border-b-0">
              <dt className="text-neutral-500 text-sm">Notes</dt>
              <dd className="text-neutral-900 text-p mt-1 whitespace-pre-wrap wrap-break-word">
                {customer.notes}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <RequireRole
      allowedRoles={[ROLE_SLUGS.ADMIN, ROLE_SLUGS.DISPATCHER, ROLE_SLUGS.TECHNICIAN]}
    >
      <CustomerDetailInner />
    </RequireRole>
  );
}
