"use client";

import RequireRole from "@/components/auth/RequireRole";
import CustomerModal from "@/components/customers/CustomerModal";
import NewEmployeeModal from "@/components/employees/NewEmployeeModal";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { deleteCustomer, getCustomerDetails } from "@/lib/api/customers";
import type { CustomerDetail } from "@/lib/api/customers";
import { ROLE_SLUGS } from "@/types/auth";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { LuArrowLeft } from "react-icons/lu";
import type { AxiosError } from "axios";
import { HiChatBubbleBottomCenterText, HiInbox, HiPhone } from "react-icons/hi2";
import JobAddress from "@/components/jobs/JobAddress";
import CustomerNotes from "@/components/customers/CustomerNotes";
import JobHistory from "@/components/customers/JobHistory";

function displayName(c: Pick<CustomerDetail, "firstName" | "lastName">) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
}

function CustomerDetailInner() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const customerId = typeof params?.customerId === "string" ? params.customerId : "";
  const companyId = useSelector((state: RootState) => selectCurrentCompanyId(state));

  const canFetch = Boolean(customerId && companyId);

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const refetchCustomer = useCallback(() => {
    if (!companyId || !customerId) return;
    void getCustomerDetails(companyId, customerId)
      .then((res) => setCustomer(res.customer))
      .catch((err: AxiosError<{ message?: string }>) => {
        setCustomer(null);
        const msg =
          err.response?.data?.message ??
          (err.response?.status === 404 ? "Customer not found" : null) ??
          err.message ??
          "Failed to load customer";
        setError(msg);
      });
  }, [companyId, customerId]);

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

  useEffect(() => {
    const action = searchParams.get("action");
    if (!action || fetchLoading) return;
    if (action !== "updateCustomer" && action !== "removeCustomer") return;
    if (customer) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("action");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [searchParams, customer, fetchLoading, router, pathname]);

  useEffect(() => {
    if (searchParams.get("action") !== "updateCustomer" || !customer) return;
    queueMicrotask(() => {
      setEditModalOpen(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("action");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    });
  }, [searchParams, customer, router, pathname]);

  useEffect(() => {
    if (searchParams.get("action") !== "removeCustomer" || !customer) return;
    queueMicrotask(() => {
      setDeleteConfirmOpen(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("action");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    });
  }, [searchParams, customer, router, pathname]);

  const handleConfirmDelete = useCallback(() => {
    if (!customer || !companyId) return;
    setDeleteLoading(true);
    void deleteCustomer(customer.id, companyId)
      .then(() => {
        setDeleteConfirmOpen(false);
        router.push("/customers");
      })
      .finally(() => setDeleteLoading(false));
  }, [customer, companyId, router]);

  if (!companyId) return

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
      <div className="flex flex-col items-center justify-center">
        <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
        <p className="text-p font-bold mt-2 text-neutral-600">Loading customer...</p>
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
      <CustomerModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        companyId={companyId}
        mode="edit"
        customer={customer}
        title="Customer Information"
        onSuccess={() => {
          refetchCustomer();
        }}
      />

      <NewEmployeeModal
        open={deleteConfirmOpen}
        onClose={() => !deleteLoading && setDeleteConfirmOpen(false)}
        title="Delete customer?"
      >
        <div className="space-y-4">
          <p className="text-neutral-700 text-p">
            Are you sure you want to delete <strong>{name}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteLoading}
              className="px-4 py-2 rounded-lg cursor-pointer border border-neutral-400 text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="px-4 py-2 rounded-lg cursor-pointer bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {deleteLoading ? (
                <>
                  <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </NewEmployeeModal>

      <Link
        href="/customers"
        className="hidden items-center gap-2 text-primary font-medium hover:underline sm:inline-flex"
      >
        <LuArrowLeft className="size-5" />
        Back to customers
      </Link>

      <div className="rounded-lg p-4 border border-neutral-300 bg-neutral-50 sm:p-6">
        <h1 className="text-h4 font-bold text-neutral-900">{name}</h1>
        <div className="mt-4 flex flex-col gap-y-2">
          {customer.email && (
            <div className="flex items-center justify-between">
              <p className="text-p text-neutral-800">{customer.email}</p>
              <div className="p-2 rounded-full w-fit bg-neutral-300/50">
                <HiInbox className="size-6 text-neutral-600" />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-p text-neutral-800">{customer.phone}</p>
            <div className="flex gap-x-1">
              <Link href={`sms:${customer.phone}`} className="p-2 rounded-full w-fit bg-primary/20">
                <HiChatBubbleBottomCenterText className="size-6 text-primary" />
              </Link>
              <Link href={`tel:${customer.phone}`} className="p-2 rounded-full w-fit bg-primary/20">
                <HiPhone className="size-6 text-primary" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/*  */}
      <JobAddress
        layout="page"
        address={customer.address}
        address2={customer.address2}
        city={customer.city}
        zipCode={customer.zipCode}
      />
      <CustomerNotes
        customerId={customer.id}
        companyId={companyId}
        notes={customer.notes}
        onSaved={(updated) =>
          setCustomer((prev) => (prev ? { ...prev, ...updated } : null))
        }
      />
      <JobHistory companyId={companyId} customerId={customer.id} />
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
