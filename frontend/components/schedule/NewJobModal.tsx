"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import Modal from "@/components/ui/Modal";
import type { Job } from "@/lib/calendar/types";
import { jobOverlapsWindow } from "@/lib/calendar/types";
import { searchCustomers } from "@/lib/api/customers";
import type { CustomerListItem } from "@/lib/api/customers";
import type { EmployeeListItem } from "@/lib/api/company";
import {
  getServiceBooks,
  getServiceItemsByCategory,
  type ServiceBookItem,
  type ServiceBookCategoryItem,
  type ServiceItemListItem,
} from "@/lib/api/service";
import { getAvailableTechniciansForWindow } from "@/lib/api/availability";
import { createJob, mapApiJobToJob } from "@/lib/api/jobs";

const SEARCH_DEBOUNCE_MS = 300;

function displayCustomer(c: CustomerListItem) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || c.phone || "—";
}

function displayEmployee(emp: EmployeeListItem) {
  const u = emp.user;
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—";
}

export interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: Job) => void;
  existingJobs: Job[];
}

export default function NewJobModal({
  isOpen,
  onClose,
  onSave,
  existingJobs,
}: NewJobModalProps) {
  const companyId = useSelector((state: RootState) =>
    selectCurrentCompanyId(state)
  );

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerListItem[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  const [technicianSearch, setTechnicianSearch] = useState("");
  const [allTechnicians, setAllTechnicians] = useState<EmployeeListItem[]>([]);
  const [technicianLoading, setTechnicianLoading] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<EmployeeListItem | null>(null);
  const [technicianDropdownOpen, setTechnicianDropdownOpen] = useState(false);

  // Service Book → Category → ServiceItem selection
  const [selectedServiceItems, setSelectedServiceItems] = useState<ServiceItemListItem[]>([]);
  const [serviceBooks, setServiceBooks] = useState<ServiceBookItem[]>([]);
  const [selectedServiceBook, setSelectedServiceBook] = useState<ServiceBookItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ServiceBookCategoryItem | null>(null);
  const [categoryServiceItems, setCategoryServiceItems] = useState<ServiceItemListItem[]>([]);
  const [serviceBooksLoading, setServiceBooksLoading] = useState(false);
  const [categoryItemsLoading, setCategoryItemsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** 'books' | 'categories' | 'items' when the services picker is stepped into */
  const [servicesPickerView, setServicesPickerView] = useState<"books" | "categories" | "items" | null>(null);

  const customerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const technicianDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveEndDate = endDate || startDate;
  const effectiveEndTime = endTime || startTime;

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

  const loadTechnicians = useCallback(() => {
    if (!companyId) {
      setAllTechnicians([]);
      return;
    }
    const hasWindow = startDate && effectiveEndDate && startTime && effectiveEndTime;
    if (!hasWindow) {
      setAllTechnicians([]);
      setTechnicianLoading(false);
      return;
    }
    setTechnicianLoading(true);
    const term = technicianSearch.trim();
    getAvailableTechniciansForWindow({
      startDate,
      endDate: effectiveEndDate,
      startTime,
      endTime: effectiveEndTime,
      ...(term && { q: term }),
    })
      .then((res) => {
        setAllTechnicians(res.employees ?? []);
      })
      .catch(() => setAllTechnicians([]))
      .finally(() => setTechnicianLoading(false));
  }, [companyId, startDate, effectiveEndDate, startTime, effectiveEndTime, technicianSearch]);

  useEffect(() => {
    if (!isOpen) return;
    if (technicianDebounceRef.current) {
      clearTimeout(technicianDebounceRef.current);
    }
    technicianDebounceRef.current = setTimeout(() => {
      technicianDebounceRef.current = null;
      loadTechnicians();
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (technicianDebounceRef.current) {
        clearTimeout(technicianDebounceRef.current);
      }
    };
  }, [isOpen, startDate, endDate, startTime, endTime, technicianSearch, loadTechnicians]);

  // Load service books when user opens the Service Book picker
  useEffect(() => {
    if (!isOpen || !companyId || servicesPickerView !== "books") return;
    queueMicrotask(() => setServiceBooksLoading(true));
    getServiceBooks(companyId)
      .then((res) => setServiceBooks(res.serviceBooks ?? []))
      .catch(() => setServiceBooks([]))
      .finally(() => setServiceBooksLoading(false));
  }, [isOpen, companyId, servicesPickerView]);

  // Load service items when user selects a category
  useEffect(() => {
    if (!selectedCategory) {
      queueMicrotask(() => setCategoryServiceItems([]));
      return;
    }
    queueMicrotask(() => setCategoryItemsLoading(true));
    getServiceItemsByCategory(selectedCategory.id)
      .then((res) => setCategoryServiceItems(res.serviceItems ?? []))
      .catch(() => setCategoryServiceItems([]))
      .finally(() => setCategoryItemsLoading(false));
  }, [selectedCategory]);

  const availableTechnicians = React.useMemo(() => {
    if (!startDate || !startTime || !effectiveEndDate || !effectiveEndTime) {
      return allTechnicians;
    }
    return allTechnicians.filter((emp) => {
      const techId = emp.userId;
      const overlaps = existingJobs.some((job) =>
        jobOverlapsWindow(
          job,
          startDate,
          startTime,
          effectiveEndDate,
          effectiveEndTime,
          techId
        )
      );
      return !overlaps;
    });
  }, [
    allTechnicians,
    existingJobs,
    startDate,
    startTime,
    effectiveEndDate,
    effectiveEndTime,
  ]);

  const resetForm = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);
    setEndDate(today);
    setStartTime("09:00");
    setEndTime("10:00");
    setCustomerSearch("");
    setCustomerResults([]);
    setSelectedCustomer(null);
    setTechnicianSearch("");
    setAllTechnicians([]);
    setSelectedTechnician(null);
    setSelectedServiceItems([]);
    setServiceBooks([]);
    setSelectedServiceBook(null);
    setSelectedCategory(null);
    setCategoryServiceItems([]);
    setServicesPickerView(null);
    setSubmitError(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => resetForm());
    }
  }, [isOpen, resetForm]);

  const handleSubmit = async () => {
    if (!companyId || !selectedCustomer || !selectedTechnician) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const response = await createJob({
        companyId,
        customerId: selectedCustomer.id,
        technicianId: selectedTechnician.id,
        startDate,
        endDate: effectiveEndDate,
        startTime,
        endTime: effectiveEndTime,
        status: "scheduled",
        serviceItemIds:
          selectedServiceItems.length > 0
            ? selectedServiceItems.map((s) => s.id)
            : undefined,
      });
      const job = mapApiJobToJob(response.job);
      onSave(job);
      resetForm();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Failed to create job. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(
    companyId &&
      selectedCustomer &&
      selectedTechnician &&
      startDate &&
      startTime &&
      effectiveEndDate >= startDate &&
      (effectiveEndDate === startDate ? effectiveEndTime > startTime : true) &&
      !submitting
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Job"
      cancelLabel="Cancel"
      primaryAction={{
        label: submitting ? "Creating..." : "Create Job",
        onClick: handleSubmit,
        disabled: !canSubmit,
      }}
    >
      <div className="space-y-4">
        {submitError && (
          <p className="text-p text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {submitError}
          </p>
        )}
        {/* Customer search & select */}
        <div className="relative">
          <label className="block text-small font-semibold text-neutral-700 mb-1">
            Customer
          </label>
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2">
              <span className="text-p text-neutral-900">
                {displayCustomer(selectedCustomer)}
                {selectedCustomer.address && (
                  <span className="text-neutral-500 text-small block truncate">
                    {selectedCustomer.address}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerSearch("");
                }}
                className="text-small text-primary hover:underline"
              >
                Clear
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomerDropdownOpen(true);
                }}
                onFocus={() => setCustomerDropdownOpen(true)}
                placeholder="Search customers..."
                className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {customerDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden="true"
                    onClick={() => setCustomerDropdownOpen(false)}
                  />
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 shadow-lg max-h-48 overflow-y-auto">
                    {customerLoading ? (
                      <p className="px-3 py-2 text-small text-neutral-500">
                        Searching...
                      </p>
                    ) : customerResults.length === 0 ? (
                      <p className="px-3 py-2 text-small text-neutral-500">
                        {customerSearch.trim()
                          ? "No customers found."
                          : "Type to search customers."}
                      </p>
                    ) : (
                      customerResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-p hover:bg-neutral-200 focus:bg-neutral-200 focus:outline-none"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerSearch("");
                            setCustomerDropdownOpen(false);
                          }}
                        >
                          {displayCustomer(c)}
                          {c.address && (
                            <span className="text-neutral-500 text-small block truncate">
                              {c.address}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Start / End date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-small font-semibold text-neutral-700 mb-1">
              Start date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-small font-semibold text-neutral-700 mb-1">
              End date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Start / End time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-small font-semibold text-neutral-700 mb-1">
              Start time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-small font-semibold text-neutral-700 mb-1">
              End time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Technician search & select (only available for chosen window) */}
        <div className="relative">
          <label className="block text-small font-semibold text-neutral-700 mb-1">
            Technician
          </label>
          <p className="text-xs text-neutral-500 mb-1">
            Select start/end date and time first. Only technicians whose schedule
            matches the selected window and who are not already booked are listed.
          </p>
          {selectedTechnician ? (
            <div className="flex items-center justify-between rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2">
              <span className="text-p text-neutral-900">
                {displayEmployee(selectedTechnician)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedTechnician(null);
                  setTechnicianSearch("");
                }}
                className="text-small text-primary hover:underline"
              >
                Clear
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={technicianSearch}
                onChange={(e) => {
                  setTechnicianSearch(e.target.value);
                  setTechnicianDropdownOpen(true);
                }}
                onFocus={() => setTechnicianDropdownOpen(true)}
                placeholder="Search technicians..."
                className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {technicianDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden="true"
                    onClick={() => setTechnicianDropdownOpen(false)}
                  />
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 shadow-lg max-h-48 overflow-y-auto">
                    {technicianLoading ? (
                      <p className="px-3 py-2 text-small text-neutral-500">
                        Loading...
                      </p>
                    ) : availableTechnicians.length === 0 ? (
                      <p className="px-3 py-2 text-small text-neutral-500">
                        {allTechnicians.length === 0
                          ? startDate && effectiveEndDate && startTime && effectiveEndTime
                            ? "No technicians have availability for this date/time, or try a different search."
                            : "Select start/end date and time to see available technicians."
                          : "No technicians available for this date/time (already booked)."}
                      </p>
                    ) : (
                      availableTechnicians.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-p hover:bg-neutral-200 focus:bg-neutral-200 focus:outline-none"
                          onClick={() => {
                            setSelectedTechnician(emp);
                            setTechnicianSearch("");
                            setTechnicianDropdownOpen(false);
                          }}
                        >
                          {displayEmployee(emp)}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Services: Service Book → Category → ServiceItem */}
        <div>
          <label className="block text-small font-semibold text-neutral-700 mb-1">
            Services
          </label>
          <p className="text-xs text-neutral-500 mb-2">
            Add services from your Service Book. These will be saved with the job.
          </p>
          {selectedServiceItems.length > 0 && (
            <ul className="mb-2 space-y-1">
              {selectedServiceItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-p"
                >
                  <span className="text-neutral-900">
                    {item.title}
                    {item.price != null && (
                      <span className="text-neutral-500 text-small ml-2">
                        ${item.price.toFixed(2)}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedServiceItems((prev) =>
                        prev.filter((s) => s.id !== item.id)
                      )
                    }
                    className="text-small text-red-600 hover:underline"
                    aria-label={`Remove ${item.title}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {servicesPickerView == null ? (
            <button
              type="button"
              onClick={() => setServicesPickerView("books")}
              className="rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-p text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Add from Service Book
            </button>
          ) : (
            <div className="rounded-lg border border-neutral-400 bg-neutral-50 p-3 space-y-3">
              {servicesPickerView === "books" && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-small font-semibold text-neutral-700">
                      Select Service Book
                    </span>
                    <button
                      type="button"
                      onClick={() => setServicesPickerView(null)}
                      className="text-small text-neutral-500 hover:underline"
                    >
                      Close
                    </button>
                  </div>
                  {serviceBooksLoading ? (
                    <p className="text-small text-neutral-500">Loading...</p>
                  ) : serviceBooks.length === 0 ? (
                    <p className="text-small text-neutral-500">
                      No service books found.
                    </p>
                  ) : (
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {serviceBooks.map((book) => (
                        <li key={book.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedServiceBook(book);
                              setSelectedCategory(null);
                              setServicesPickerView("categories");
                            }}
                            className="w-full text-left px-3 py-2 rounded border border-transparent hover:bg-neutral-200 hover:border-neutral-300 text-p"
                          >
                            {book.name ?? "Unnamed Service Book"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {servicesPickerView === "categories" && selectedServiceBook && (
                <>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedServiceBook(null);
                        setSelectedCategory(null);
                        setServicesPickerView("books");
                      }}
                      className="text-small text-neutral-500 hover:underline"
                    >
                      ← Back to Service Books
                    </button>
                    <button
                      type="button"
                      onClick={() => setServicesPickerView(null)}
                      className="text-small text-neutral-500 hover:underline"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-small font-semibold text-neutral-700">
                    {selectedServiceBook.name ?? "Unnamed"} – Select category
                  </p>
                  {(selectedServiceBook.catories?.length ?? 0) === 0 ? (
                    <p className="text-small text-neutral-500">
                      No categories in this book.
                    </p>
                  ) : (
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedServiceBook.catories!.map((cat) => (
                        <li key={cat.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat);
                              setServicesPickerView("items");
                            }}
                            className="w-full text-left px-3 py-2 rounded border border-transparent hover:bg-neutral-200 hover:border-neutral-300 text-p"
                          >
                            {cat.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {servicesPickerView === "items" && selectedCategory && (
                <>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(null);
                        setCategoryServiceItems([]);
                        setServicesPickerView("categories");
                      }}
                      className="text-small text-neutral-500 hover:underline"
                    >
                      ← Back to Categories
                    </button>
                    <button
                      type="button"
                      onClick={() => setServicesPickerView(null)}
                      className="text-small text-neutral-500 hover:underline"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-small font-semibold text-neutral-700">
                    {selectedCategory.name} – Click to add service
                  </p>
                  {categoryItemsLoading ? (
                    <p className="text-small text-neutral-500">Loading...</p>
                  ) : categoryServiceItems.length === 0 ? (
                    <p className="text-small text-neutral-500">
                      No service items in this category.
                    </p>
                  ) : (
                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                      {categoryServiceItems.map((item) => {
                        const alreadyAdded = selectedServiceItems.some(
                          (s) => s.id === item.id
                        );
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              disabled={alreadyAdded}
                              onClick={() => {
                                if (alreadyAdded) return;
                                setSelectedServiceItems((prev) => [...prev, item]);
                              }}
                              className={`w-full text-left px-3 py-2 rounded border text-p ${
                                alreadyAdded
                                  ? "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                  : "border-transparent hover:bg-neutral-200 hover:border-neutral-300"
                              }`}
                            >
                              <span className="font-medium">{item.title}</span>
                              {item.price != null && (
                                <span className="text-neutral-500 text-small ml-2">
                                  ${item.price.toFixed(2)}
                                </span>
                              )}
                              {alreadyAdded && (
                                <span className="text-small ml-2">(added)</span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
