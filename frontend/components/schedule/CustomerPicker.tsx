"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchCustomers } from "@/lib/api/customers";
import type { CustomerListItem } from "@/lib/api/customers";
import { HiOutlineUser, HiPlus } from "react-icons/hi2";
import { HiSearch } from "react-icons/hi";

const SEARCH_DEBOUNCE_MS = 300;

function formatCustomerPhone(phone: string | null | undefined) {
  if (!phone) return "";

  const normalized = phone.trim();
  const usMatch = normalized.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (usMatch) {
    return `(${usMatch[1]}) ${usMatch[2]}-${usMatch[3]}`;
  }

  return normalized;
}

function displayCustomer(c: CustomerListItem) {
  return (
    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
    c.email ||
    formatCustomerPhone(c.phone) ||
    "—"
  );
}

export interface CustomerPickerProps {
  isOpen: boolean;
  companyId: string | null;
  value: CustomerListItem | null;
  onChange: (customer: CustomerListItem | null) => void;
  /** When false, selection cannot be cleared (e.g. edit job). */
  allowClear: boolean;
  onModalClose: () => void;
}

export default function CustomerPicker({
  isOpen,
  companyId,
  value: selectedCustomer,
  onChange,
  allowClear,
  onModalClose,
}: CustomerPickerProps) {
  const router = useRouter();
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerListItem[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCustomers = useCallback(
    (q: string) => {
      if (!companyId) {
        setCustomerResults([]);
        return;
      }
      setCustomerLoading(true);
      searchCustomers(companyId, q)
        .then((res) => setCustomerResults(res.customers))
        .catch(() => setCustomerResults([]))
        .finally(() => setCustomerLoading(false));
    },
    [companyId]
  );

  useEffect(() => {
    if (!isOpen) return;
    const q = customerSearch.trim();
    if (q === "") {
      queueMicrotask(() => {
        setCustomerResults([]);
        setCustomerLoading(false);
      });
      return;
    }
    if (customerDebounceRef.current) {
      clearTimeout(customerDebounceRef.current);
    }
    customerDebounceRef.current = setTimeout(() => {
      customerDebounceRef.current = null;
      fetchCustomers(customerSearch);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (customerDebounceRef.current) {
        clearTimeout(customerDebounceRef.current);
      }
    };
  }, [isOpen, customerSearch, fetchCustomers]);

  return (
    <div className="relative">
      <div className="flex items-center gap-x-1.5">
        <div>
          <HiOutlineUser className="size-6 text-neutral-800" />
        </div>
        <h2 className="text-p text-neutral-800">
          Customer
        </h2>
      </div>
      {selectedCustomer ? (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3">
          <span className="text-p text-neutral-800">
            {displayCustomer(selectedCustomer)}
          </span>
          {allowClear && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setCustomerSearch("");
              }}
              className="text-small text-primary hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center cursor-default">
              <HiSearch className="size-4 text-neutral-400" />
            </div>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setCustomerDropdownOpen(true);
              }}
              onFocus={() => setCustomerDropdownOpen(true)}
              placeholder="Search name or phone"
              className="mt-2 block w-full rounded-lg border pl-10 pr-4 py-3 text-p bg-neutral-50 border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {customerDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden="true"
                onClick={() => setCustomerDropdownOpen(false)}
              />
              <div className="px-4 py-3 absolute z-50 mt-2 w-full rounded-lg border shadow max-h-64 overflow-y-auto border-neutral-200 bg-neutral-50">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerDropdownOpen(false);
                    onModalClose();
                    router.push("/customers?action=newCustomer");
                  }}
                  className="py-2 px-3 w-full rounded-2xl flex items-center gap-x-2 cursor-pointer bg-primary/90 text-neutral-100 hover:bg-primary hover:text-neutral-50"
                >
                  <div>
                    <HiPlus className="size-6" />
                  </div>
                  <span className="text-p font-bold">Create Customer</span>
                </button>
                {customerLoading ? (
                  <p className="mt-2 text-small text-neutral-400">
                    Searching...
                  </p>
                ) : customerResults.length === 0 ? (
                  <p className="mt-2 text-small text-neutral-400">
                    {customerSearch.trim()
                      ? "No customers found."
                      : "Type to search customers."}
                  </p>
                ) : (
                  <div className="mt-2 flex flex-col gap-y-1">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="text-left px-4 py-2 flex items-center justify-between gap-x-2 rounded-lg cursor-pointer transition-colors duration-300 ease-in-out group hover:bg-neutral-200 hover:border-transparent focus:outline-none"
                        onClick={() => {
                          onChange(c);
                          setCustomerSearch("");
                          setCustomerDropdownOpen(false);
                        }}
                      >
                        <span className="text-p font-bold text-neutral-600 transition-colors duration-300 ease-in-out group-hover:text-neutral-80">
                          {displayCustomer(c)}
                        </span>
                        {c.address && (
                          <span className="text-neutral-600 text-small block truncate transition-colors duration-300 ease-in-out group-hover:text-neutral-800">
                            {formatCustomerPhone(c.phone)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
