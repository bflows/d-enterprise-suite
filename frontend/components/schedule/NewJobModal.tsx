"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { createJob, mapApiJobToJob, updateJob } from "@/lib/api/jobs";
import { formatUsdFromCents } from "@/lib/money";
import { HiChevronLeft, HiPlus, HiUser } from "react-icons/hi2";
import { HiSearch } from "react-icons/hi";

const SEARCH_DEBOUNCE_MS = 300;

function displayCustomer(c: CustomerListItem) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || c.phone || "—";
}

function displayEmployee(emp: EmployeeListItem) {
  const u = emp.user;
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—";
}

function jobServiceLineToListItem(
  s: NonNullable<Job["services"]>[number]
): ServiceItemListItem {
  return {
    id: s.id,
    categoryId: "",
    type: "SERVICE",
    title: s.name,
    description: s.description ?? "",
    price: s.price,
    duration: 0,
    unit: s.quantity,
    sortOrder: null,
    createdAt: "",
    updatedAt: "",
  };
}

function jobToCustomerPlaceholder(job: Job, companyId: string): CustomerListItem {
  return {
    id: job.customerId!,
    companyId,
    firstName: job.customerFirstName ?? "",
    lastName: job.customerLastName ?? "",
    phone: job.customerPhone ?? "",
    address: job.address ?? "",
    email: job.customerEmail ?? null,
    leadSource: null,
    address2: job.address2 ?? null,
    city: job.city ?? null,
    zipCode: job.zipCode ?? null,
    notes: null,
  };
}

function jobToTechnicianPlaceholder(job: Job, companyId: string): EmployeeListItem {
  const name = job.technicianName ?? "";
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  return {
    id: job.technicianId!,
    userId: "",
    companyId,
    roleSlug: "technician",
    user: {
      id: "",
      email: "",
      firstName,
      lastName,
      phoneNumber: "",
      createdAt: "",
      updatedAt: "",
    },
  };
}

export interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: Job) => void;
  existingJobs: Job[];
  /** When set, the modal updates this job instead of creating a new one (same form as create). */
  jobToEdit?: Job | null;
}

export default function NewJobModal({
  isOpen,
  onClose,
  onSave,
  existingJobs,
  jobToEdit = null,
}: NewJobModalProps) {
  const router = useRouter();
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
  const [notes, setNotes] = useState("");

  const customerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const technicianDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jobToEditRef = useRef(jobToEdit);
  jobToEditRef.current = jobToEdit;

  const isEditMode = Boolean(jobToEdit);
  const effectiveEndDate = endDate || startDate;
  const effectiveEndTime = endTime || startTime;

  const jobsForOverlap = React.useMemo(() => {
    if (!jobToEdit) return existingJobs;
    return existingJobs.filter((j) => j.id !== jobToEdit.id);
  }, [existingJobs, jobToEdit]);

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
      const techId = emp.id;
      const overlaps = jobsForOverlap.some((job) =>
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
    jobsForOverlap,
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
    setNotes("");
    setSubmitError(null);
  }, []);

  const populateFromJob = useCallback((job: Job, cid: string) => {
    setStartDate(job.date);
    setEndDate(job.endDate ?? job.date);
    setStartTime(job.startTime);
    setEndTime(job.endTime ?? job.startTime);
    setNotes(job.notes ?? "");
    setSubmitError(null);
    setCustomerSearch("");
    setCustomerResults([]);
    setCustomerDropdownOpen(false);
    setSelectedCustomer(
      job.customerId ? jobToCustomerPlaceholder(job, cid) : null
    );
    setTechnicianSearch("");
    setAllTechnicians([]);
    setTechnicianDropdownOpen(false);
    setSelectedTechnician(
      job.technicianId ? jobToTechnicianPlaceholder(job, cid) : null
    );
    setSelectedServiceItems(
      (job.services ?? []).map((line) => jobServiceLineToListItem(line))
    );
    setServiceBooks([]);
    setSelectedServiceBook(null);
    setSelectedCategory(null);
    setCategoryServiceItems([]);
    setServicesPickerView(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const j = jobToEditRef.current;
    if (j && companyId) {
      queueMicrotask(() => populateFromJob(j, companyId));
    } else if (!j) {
      queueMicrotask(() => resetForm());
    }
  }, [isOpen, jobToEdit?.id, companyId, populateFromJob, resetForm]);

  const handleSubmit = async () => {
    if (!companyId || !selectedCustomer || !selectedTechnician) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (jobToEdit) {
        const response = await updateJob(jobToEdit.id, {
          startDate,
          endDate: effectiveEndDate,
          startTime,
          endTime: effectiveEndTime,
          notes: notes.trim() ? notes.trim() : null,
          ...(selectedTechnician && { technicianId: selectedTechnician.id }),
          serviceItemIds: selectedServiceItems.map((s) => s.id),
        });
        const job = mapApiJobToJob(response.job);
        onSave(job);
        onClose();
      } else {
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
          ...(notes.trim() && { notes: notes.trim() }),
        });
        const job = mapApiJobToJob(response.job);
        onSave(job);
        resetForm();
        onClose();
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        (jobToEdit
          ? "Failed to update job. Please try again."
          : "Failed to create job. Please try again.");
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
      title={isEditMode ? "Edit Job" : "New Job"}
      cancelLabel="Cancel"
      primaryAction={{
        label: submitting
          ? isEditMode
            ? "Saving..."
            : "Creating..."
          : isEditMode
            ? "Save"
            : "Create Job",
        onClick: handleSubmit,
        disabled: !canSubmit,
      }}
    >
      <div>
        {submitError && (
          <p className="text-p text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {submitError}
          </p>
        )}
        {/* Customer search & select */}
        <div className="relative">
          <div className="flex items-center gap-x-2">
            <div>
              <HiUser className="size-6 text-neutral-800" />
            </div>
            <h2 className="text-h6 font-bold text-neutral-800">
              Customer
            </h2>
          </div>
          {selectedCustomer ? (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2">
              <span className="text-p text-neutral-800">
                {displayCustomer(selectedCustomer)}
                {selectedCustomer.address && (
                  <span className="text-neutral-600 text-small block truncate">
                    {selectedCustomer.address}
                  </span>
                )}
              </span>
              {!isEditMode && (
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
              )}
            </div>
          ) : (
            <>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center cursor-default">
                  <HiSearch className="size-5 text-neutral-600" />
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
                  className="mt-4 block w-full rounded-lg border pl-12 pr-4 py-4 text-p bg-neutral-50 border-neutral-300 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {customerDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden="true"
                    onClick={() => setCustomerDropdownOpen(false)}
                  />
                  <div className="px-3 py-3 absolute z-50 mt-2 w-full rounded-lg border shadow-lg max-h-64 overflow-y-auto border-neutral-300 bg-neutral-50">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerDropdownOpen(false);
                        onClose();
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
                              setSelectedCustomer(c);
                              setCustomerSearch("");
                              setCustomerDropdownOpen(false);
                            }}
                          >
                            <span className="text-p font-bold text-neutral-600 transition-colors duration-300 ease-in-out group-hover:text-neutral-80">
                              {displayCustomer(c)}
                            </span>
                            {c.address && (
                              <span className="text-neutral-600 text-small block truncate transition-colors duration-300 ease-in-out group-hover:text-neutral-800">
                                {c.phone}
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

        {/* Start / End date */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-p text-neutral-600">
              Start date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-p bg-neutral-50 border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-p text-neutral-600">
              End date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-p bg-neutral-50 border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Start / End time */}
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-p text-neutral-600">
              Start time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-p bg-neutral-50 border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-p text-neutral-600">
              End time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-p bg-neutral-50 border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Technician search & select (only available for chosen window) */}
        <div className="relative mt-4">
          <label className="block text-p text-neutral-600">
            Technician
          </label>
          <p className="text-small text-neutral-600">
            Select start/end date and time first.
          </p>
          {selectedTechnician ? (
            <div className="flex items-center justify-between rounded-lg border px-3 py-2 border-neutral-300 bg-neutral-50">
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
                className="mt-2 w-full rounded-lg border px-3 py-2 text-p bg-neutral-50 border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {technicianDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden="true"
                    onClick={() => setTechnicianDropdownOpen(false)}
                  />
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-300 bg-neutral-50 shadow-lg max-h-48 overflow-y-auto">
                    {technicianLoading ? (
                      <p className="px-3 py-2 text-small text-neutral-600">
                        Searching...
                      </p>
                    ) : availableTechnicians.length === 0 ? (
                      <p className="px-3 py-2 text-small text-neutral-400">
                        {allTechnicians.length === 0
                          ? startDate && effectiveEndDate && startTime && effectiveEndTime
                            ? "No technicians have availability for this date/time, try a different search."
                            : "Select start/end date and time to see available technicians."
                          : "No technicians available for this date/time (already booked)."}
                      </p>
                    ) : (
                      <div className="py-3 px-2 flex flex-col gap-y-1">
                        {availableTechnicians.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-p rounded-lg text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none"
                            onClick={() => {
                              setSelectedTechnician(emp);
                              setTechnicianSearch("");
                              setTechnicianDropdownOpen(false);
                            }}
                          >
                            {displayEmployee(emp)}
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

        {/* Services: Service Book → Category → ServiceItem */}
        <div className="mt-4">
          <label className="block text-p text-neutral-600">
            Services
          </label>
          {selectedServiceItems.length > 0 && (
            <ul className="mt-1 flex flex-col gap-y-1">
              {selectedServiceItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-p"
                >
                  <span className="text-neutral-900">
                    {item.title}
                    {item.price != null && (
                      <span className="text-neutral-500 text-small ml-2">
                        {formatUsdFromCents(item.price)}
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
              className="mt-1 rounded-lg border px-3 py-2 text-p bg-neutral-50 text-neutral-600 border-neutral-300 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Open Service Books
            </button>
          ) : (
            <div className="mt-2 rounded-lg border p-3 space-y-3 border-neutral-300 bg-neutral-50">
              {servicesPickerView === "books" && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-small text-neutral-800">
                      Select Service Book
                    </span>
                    <button
                      type="button"
                      onClick={() => setServicesPickerView(null)}
                      className="text-small text-neutral-600 hover:underline"
                    >
                      Close
                    </button>
                  </div>
                  {serviceBooksLoading ? (
                    <p className="text-small text-neutral-400">Loading...</p>
                  ) : serviceBooks.length === 0 ? (
                    <p className="text-small text-neutral-400">
                      No service books found.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-y-1 max-h-40 overflow-y-auto">
                      {serviceBooks.map((book) => (
                        <li key={book.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedServiceBook(book);
                              setSelectedCategory(null);
                              setServicesPickerView("categories");
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg border bg-neutral-100 border-neutral-300 text-neutral-600 hover:bg-neutral-200 hover:border-primary text-p"
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
                      className="flex items-center gap-x-2 text-neutral-600 hover:underline"
                    >
                      <div>
                        <HiChevronLeft className="size-4" />
                      </div>
                      <span className="text-small">Service Books</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setServicesPickerView(null)}
                      className="text-small text-neutral-500 hover:underline"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-small text-neutral-800">
                    {selectedServiceBook.name ?? "Unnamed"}
                  </p>
                  {(selectedServiceBook.catories?.length ?? 0) === 0 ? (
                    <p className="text-small text-neutral-400">
                      No categories in this book.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-y-1 max-h-40 overflow-y-auto">
                      {selectedServiceBook.catories!.map((cat) => (
                        <li key={cat.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat);
                              setServicesPickerView("items");
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg border bg-neutral-100 border-neutral-300 text-neutral-600 hover:bg-neutral-200 hover:border-primary text-p"
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
                      className="flex items-center gap-x-2 text-neutral-600 hover:underline"
                    >
                      <div>
                        <HiChevronLeft className="size-4" />
                      </div>
                      <span className="text-small">Categories</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setServicesPickerView(null)}
                      className="text-small text-neutral-600 hover:underline"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-small text-neutral-800">
                    {selectedCategory.name}
                  </p>
                  {categoryItemsLoading ? (
                    <p className="text-small text-neutral-400">Loading...</p>
                  ) : categoryServiceItems.length === 0 ? (
                    <p className="text-small text-neutral-400">
                      No service items in this category.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-y-1 max-h-48 overflow-y-auto">
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
                              className={`w-full text-left px-3 py-2 rounded-lg border flex items-center justify-between ${alreadyAdded
                                ? "bg-neutral-100/50 text-neutral-600/50 border-neutral-300/50 cursor-not-allowed"
                                : "group bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-primary hover:text-neutral-50"
                                }`}
                            >
                              <div className="">
                                <span className="text-p font-bold">{item.title}</span>
                                {item.price != null && (
                                  <span className="text-small ml-2 group-hover:text-neutral-50">
                                    {formatUsdFromCents(item.price)}
                                  </span>
                                )}
                              </div>
                              {alreadyAdded && (
                                <span className="text-small ml-4">(added)</span>
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

        <div className="mt-4 flex flex-col">
          <label htmlFor="notes" className="text-neutral-600 text-p">Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 rounded-lg py-2 px-3 border text-neutral-800 bg-neutral-50 border-neutral-300 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </Modal>
  );
}
