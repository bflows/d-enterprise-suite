"use client";

import { LuUserRoundPlus, LuUserRoundPen, LuUserRoundMinus, LuUserRoundSearch } from "react-icons/lu";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { getCustomers, searchCustomers, deleteCustomer } from "@/lib/api/customers";
import type { CustomerListItem } from "@/lib/api/customers";
import { useEffect, useState, useCallback, useRef } from "react";
import NewEmployeeModal from "@/components/employees/NewEmployeeModal";
import NewCustomerForm from "@/components/customers/NewCustomerForm";
import EditCustomerForm from "@/components/customers/EditCustomerForm";
import Link from "next/link";

const SEARCH_DEBOUNCE_MS = 300;

function displayName(c: CustomerListItem) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
}

function CustomerCard({
  customer,
  onEdit,
  onDelete,
  onOpenDetails,
}: {
  customer: CustomerListItem;
  onEdit: (customer: CustomerListItem) => void;
  onDelete: (customer: CustomerListItem) => void;
  onOpenDetails: (customer: CustomerListItem) => void;
}) {
  const name = displayName(customer);
  const optional: { label: string; value: string | null }[] = [];
  if (customer.email) optional.push({ label: "Email", value: customer.email });
  if (customer.leadSource) optional.push({ label: "Lead source", value: customer.leadSource });
  if (customer.address2) optional.push({ label: "Address 2", value: customer.address2 });
  if (customer.notes) optional.push({ label: "Notes", value: customer.notes });

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(customer)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetails(customer);
        }
      }}
      className="rounded-lg p-4 cursor-pointer transition-colors bg-neutral-50 border border-neutral-300 hover:border-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-neutral-900 font-semibold text-p">{name}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(customer);
            }}
            className="p-1.5 rounded-lg text-neutral-600 hover:bg-primary/10 hover:text-primary transition-colors"
            aria-label={`Edit ${name}`}
          >
            <LuUserRoundPen className="size-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(customer);
            }}
            className="p-1.5 rounded-lg text-neutral-600 hover:bg-red-100 hover:text-red-600 transition-colors"
            aria-label={`Delete ${name}`}
          >
            <LuUserRoundMinus className="size-6" />
          </button>
        </div>
      </div>
      <p className="text-neutral-700 text-p mt-1">
        <a
          href={`tel:${customer.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="hover:text-primary underline"
        >
          {customer.phone}
        </a>
      </p>
      <p className="text-neutral-700 text-p mt-1">{customer.address}</p>
      {optional.length > 0 && (
        <dl className="mt-3 pt-3 border-t border-neutral-300 space-y-1">
          {optional.map(({ label, value }) => (
            value && (
              <div key={label} className="flex flex-wrap gap-x-2">
                <dt className="text-neutral-500 text-sm">{label}:</dt>
                <dd className="text-neutral-800 text-sm wrap-break-word">{value}</dd>
              </div>
            )
          ))}
        </dl>
      )}
    </article>
  );
}

export default function CustomersTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const companyId = useSelector((state: RootState) =>
    selectCurrentCompanyId(state)
  );
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadWithSearch = useCallback(
    (q: string) => {
      if (!companyId) return;
      setLoading(true);
      setError(null);
      const term = q.trim();
      const request = term
        ? searchCustomers(companyId, term)
        : getCustomers(companyId);
      request
        .then((res) => setCustomers(res.customers))
        .catch((err) => {
          setError(
            err.response?.data?.message ?? err.message ?? "Failed to load customers"
          );
          setCustomers([]);
        })
        .finally(() => setLoading(false));
    },
    [companyId]
  );

  // Derive display state when no company: avoid setState in effect (cascading renders)
  const effectiveCustomers = companyId ? customers : [];
  const effectiveLoading = companyId ? loading : false;
  const effectiveError = companyId ? error : null;

  useEffect(() => {
    if (!companyId) return;
    const term = searchQuery.trim();
    if (term === "") {
      queueMicrotask(() => loadWithSearch(""));
      return;
    }
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    searchDebounceRef.current = setTimeout(() => {
      searchDebounceRef.current = null;
      loadWithSearch(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [companyId, searchQuery, loadWithSearch]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action !== "newCustomer") return;

    queueMicrotask(() => setModalOpen(true));

    const next = new URLSearchParams(searchParams.toString());
    next.delete("action");
    const suffix = next.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname);
  }, [searchParams, router, pathname]);

  useEffect(() => {
    if (searchParams.get("newCustomer") !== "1") return;
    queueMicrotask(() => {
      setModalOpen(true);
      router.replace("/customers", { scroll: false });
    });
  }, [searchParams, router]);

  useEffect(() => {
    if (searchParams.get("newJob") !== "1") return;
    queueMicrotask(() => {
      router.replace("/schedule?newJob=1", { scroll: false });
    });
  }, [searchParams, router]);

  const handleConfirmDelete = useCallback(() => {
    if (!customerToDelete || !companyId) return;
    setDeleting(true);
    deleteCustomer(customerToDelete.id, companyId)
      .then(() => {
        setCustomerToDelete(null);
        loadWithSearch(searchQuery.trim());
      })
      .catch(() => {
        setDeleting(false);
      })
      .finally(() => setDeleting(false));
  }, [customerToDelete, companyId, loadWithSearch, searchQuery]);

  return (
    <div className="overflow-hidden rounded-lg py-4 px-4 border bg-neutral-50 border-neutral-300 md:px-6 md:py-8 lg:px-10">
      <div>
        <h1 className="hidden text-h4 font-bold text-neutral-900 sm:inline">Customers</h1>
        <div className="flex justify-between sm:mt-4">
          <div className="z-10 relative flex items-center w-full sm:w-auto">
            <LuUserRoundSearch className="absolute text-neutral-600 size-6 left-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name or phone"
              className="w-full text-p border border-neutral-300 rounded-lg py-3 pl-12 pr-4 bg-neutral-100 text-neutral-600 sm:w-48 focus:outline-none focus:border focus:ring focus:ring-primary focus:border-primary placeholder:text-neutral-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="hidden py-2 px-4 rounded-lg w-full items-center justify-center gap-x-2 cursor-pointer transition-colors duration-300 ease-in-out bg-primary text-neutral-100 hover:bg-primary/90 sm:flex sm:w-fit"
          >
            <LuUserRoundPlus className="size-6" />
            <p className="text-p font-bold">New Customer</p>
          </button>
        </div>

        <NewEmployeeModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="New Customer"
        >
          {companyId ? (
            <NewCustomerForm
              companyId={companyId}
              onClose={() => setModalOpen(false)}
              onSuccess={() => {
                loadWithSearch(searchQuery.trim());
              }}
            />
          ) : (
            <p className="text-neutral-600 text-p">No company selected.</p>
          )}
        </NewEmployeeModal>

        <NewEmployeeModal
          open={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
          title="Edit Customer"
        >
          {editingCustomer && companyId ? (
            <EditCustomerForm
              companyId={companyId}
              customer={editingCustomer}
              onClose={() => setEditingCustomer(null)}
              onSuccess={() => {
                loadWithSearch(searchQuery.trim());
              }}
            />
          ) : null}
        </NewEmployeeModal>

        <NewEmployeeModal
          open={!!customerToDelete}
          onClose={() => !deleting && setCustomerToDelete(null)}
          title="Delete customer?"
        >
          {customerToDelete ? (
            <div className="space-y-4">
              <p className="text-neutral-700 text-p">
                Are you sure you want to delete{" "}
                <strong>{displayName(customerToDelete)}</strong>? This cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerToDelete(null)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg cursor-pointer border border-neutral-400 text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg cursor-pointer bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {deleting ? (
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
          ) : null}
        </NewEmployeeModal>

        {/* Data area: loading, error, or table/cards */}
        {effectiveLoading ? (
          <div className="mt-6 flex justify-center min-h-30 items-center">
            <div className="text-center">
              <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
              <p className="text-neutral-800 text-p mt-2">Loading customers...</p>
            </div>
          </div>
        ) : effectiveError ? (
          <p className="text-neutral-600 text-p py-6 mt-6">{effectiveError}</p>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="mt-4 flex flex-col gap-y-2 md:hidden">
              {effectiveCustomers.length === 0 ? (
                <p className="text-neutral-800 text-p text-center py-8">
                  {searchQuery.trim()
                    ? "No customers match your search."
                    : "No customers yet. Add a customer to get started."}
                </p>
              ) : (
                effectiveCustomers.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onEdit={(c) => setEditingCustomer(c)}
                    onDelete={(c) => setCustomerToDelete(c)}
                    onOpenDetails={(c) => router.push(`/customers/${c.id}`)}
                  />
                ))
              )}
            </div>

            {/* Desktop/tablet: table */}
            <div className="mt-6 hidden md:block overflow-x-auto">
              <table className="w-full table-auto max-h-[80vh]">
                <thead>
                  <tr>
                    <th className="text-left text-neutral-600 text-p font-normal py-2">
                      Name
                    </th>
                    <th className="text-left text-neutral-600 text-p font-normal py-2">
                      Phone
                    </th>
                    <th className="text-left text-neutral-600 text-p font-normal py-2">
                      Address
                    </th>
                    <th className="text-left text-neutral-600 text-p font-normal py-2 hidden lg:table-cell">
                      Email
                    </th>
                    <th className="text-left text-neutral-600 text-p font-normal py-2 hidden xl:table-cell">
                      Lead source
                    </th>
                    <th className="text-left text-neutral-600 text-p font-normal py-2 hidden xl:table-cell">
                      Address 2
                    </th>
                    <th className="text-left text-neutral-600 text-p font-normal py-2 hidden xl:table-cell">
                      Notes
                    </th>
                    <th className="text-left text-neutral-600 text-p font-normal py-2 w-12">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveCustomers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-neutral-800 text-p text-center py-8"
                      >
                        {searchQuery.trim()
                          ? "No customers match your search."
                          : "No customers yet. Add a customer to get started."}
                      </td>
                    </tr>
                  ) : (
                    effectiveCustomers.map((customer) => (
                      <tr key={customer.id} className="border-t border-neutral-200">
                        <td className="text-neutral-800 text-p py-2">
                          <Link href={`/customers/${customer.id}`}>
                            {displayName(customer)}
                          </Link>
                        </td>
                        <td className="text-neutral-800 text-p py-2">
                          <a
                            href={`tel:${customer.phone}`}
                            className="hover:text-primary underline"
                          >
                            {customer.phone}
                          </a>
                        </td>
                        <td className="text-neutral-800 text-p py-2">
                          {customer.address}
                        </td>
                        <td className="text-neutral-800 text-p py-2 hidden lg:table-cell">
                          {customer.email ?? "—"}
                        </td>
                        <td className="text-neutral-800 text-p py-2 hidden xl:table-cell">
                          {customer.leadSource ?? "—"}
                        </td>
                        <td className="text-neutral-800 text-p py-2 hidden xl:table-cell">
                          {customer.address2 ?? "—"}
                        </td>
                        <td className="text-neutral-800 text-p py-2 hidden xl:table-cell max-w-48 truncate" title={customer.notes ?? undefined}>
                          {customer.notes ?? "—"}
                        </td>
                        <td className="text-neutral-800 text-p py-2 w-12">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingCustomer(customer)}
                              className="p-1.5 rounded-lg cursor-pointer text-neutral-600 hover:bg-primary/10 hover:text-primary transition-colors"
                              aria-label={`Edit ${displayName(customer)}`}
                            >
                              <LuUserRoundPen className="size-6" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomerToDelete(customer)}
                              className="p-1.5 rounded-lg cursor-pointer text-neutral-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                              aria-label={`Delete ${displayName(customer)}`}
                            >
                              <LuUserRoundMinus className="size-6" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
