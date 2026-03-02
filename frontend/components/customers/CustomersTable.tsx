"use client";

import { LuUserRoundPlus } from "react-icons/lu";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { getCustomers } from "@/lib/api/customers";
import type { CustomerListItem } from "@/lib/api/customers";
import { useEffect, useState, useCallback } from "react";
import NewEmployeeModal from "@/components/employees/NewEmployeeModal";
import NewCustomerForm from "@/components/customers/NewCustomerForm";

function displayName(c: CustomerListItem) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
}

function CustomerCard({ customer }: { customer: CustomerListItem }) {
  const name = displayName(customer);
  const optional: { label: string; value: string | null }[] = [];
  if (customer.email) optional.push({ label: "Email", value: customer.email });
  if (customer.leadSource) optional.push({ label: "Lead source", value: customer.leadSource });
  if (customer.address2) optional.push({ label: "Address 2", value: customer.address2 });
  if (customer.notes) optional.push({ label: "Notes", value: customer.notes });

  return (
    <article className="bg-neutral-50 border border-neutral-400 rounded-lg p-4 shadow-sm">
      <h3 className="text-neutral-900 font-semibold text-p">{name}</h3>
      <p className="text-neutral-700 text-p mt-1">
        <a href={`tel:${customer.phone}`} className="hover:text-primary underline">
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
  const companyId = useSelector((state: RootState) =>
    selectCurrentCompanyId(state)
  );
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadCustomers = useCallback(() => {
    if (!companyId) {
      setLoading(false);
      setCustomers([]);
      return;
    }
    setLoading(true);
    setError(null);
    getCustomers(companyId)
      .then((res) => setCustomers(res.customers))
      .catch((err) => {
        setError(
          err.response?.data?.message ?? err.message ?? "Failed to load customers"
        );
        setCustomers([]);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    queueMicrotask(() => loadCustomers());
  }, [loadCustomers]);

  return (
    <div className="bg-neutral-50 border border-neutral-400 overflow-hidden rounded-lg py-8 px-4 sm:px-6 md:px-10 mt-8">
      {loading ? (
        <div className="flex justify-center">
          <div className="text-center">
            <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
            <p className="text-neutral-800 text-p mt-2">Loading customers...</p>
          </div>
        </div>
      ) : error ? (
        <p className="text-neutral-600 text-p py-6">{error}</p>
      ) : (
        <div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="bg-primary text-neutral-100 py-2 px-4 rounded-lg w-full sm:w-fit flex items-center justify-center gap-x-2 cursor-pointer transition-colors duration-300 ease-in-out hover:bg-primary/90"
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
                  loadCustomers();
                }}
              />
            ) : (
              <p className="text-neutral-600 text-p">No company selected.</p>
            )}
          </NewEmployeeModal>

          {/* Mobile: card list */}
          <div className="mt-6 md:hidden space-y-4">
            {customers.length === 0 ? (
              <p className="text-neutral-800 text-p text-center py-8">
                No customers yet. Add a customer to get started.
              </p>
            ) : (
              customers.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} />
              ))
            )}
          </div>

          {/* Desktop/tablet: table */}
          <div className="mt-6 hidden md:block overflow-x-auto">
            <table className="w-full table-auto">
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
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-neutral-800 text-p text-center py-8"
                    >
                      No customers yet. Add a customer to get started.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="border-t border-neutral-300">
                      <td className="text-neutral-800 text-p py-3">
                        {displayName(customer)}
                      </td>
                      <td className="text-neutral-800 text-p py-3">
                        <a
                          href={`tel:${customer.phone}`}
                          className="hover:text-primary underline"
                        >
                          {customer.phone}
                        </a>
                      </td>
                      <td className="text-neutral-800 text-p py-3">
                        {customer.address}
                      </td>
                      <td className="text-neutral-800 text-p py-3 hidden lg:table-cell">
                        {customer.email ?? "—"}
                      </td>
                      <td className="text-neutral-800 text-p py-3 hidden xl:table-cell">
                        {customer.leadSource ?? "—"}
                      </td>
                      <td className="text-neutral-800 text-p py-3 hidden xl:table-cell">
                        {customer.address2 ?? "—"}
                      </td>
                      <td className="text-neutral-800 text-p py-3 hidden xl:table-cell max-w-48 truncate" title={customer.notes ?? undefined}>
                        {customer.notes ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
