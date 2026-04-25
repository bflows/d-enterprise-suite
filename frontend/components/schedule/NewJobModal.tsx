"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import type { Job } from "@/lib/calendar/types";
import { addMinutesToHhMm } from "@/lib/calendar/types";
import { searchCustomers } from "@/lib/api/customers";
import type { CustomerListItem } from "@/lib/api/customers";
import type { EmployeeListItem } from "@/lib/api/company";
import type { ServiceItemListItem } from "@/lib/api/service";
import NewJobServiceBookSection from "@/components/schedule/NewJobServiceBookSection";
import TechnicianSearch from "@/components/schedule/TechnicianSearch";
import { createJob, mapApiJobToJob, updateJob } from "@/lib/api/jobs";
import { HiOutlineCalendar, HiOutlineClock, HiOutlineDocumentText, HiOutlineUser, HiPlus } from "react-icons/hi2";
import { HiSearch } from "react-icons/hi";

const SEARCH_DEBOUNCE_MS = 300;

function displayCustomer(c: CustomerListItem) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || c.phone || "—";
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
    duration: s.duration ?? 0,
    unit: s.serviceUnit != null && s.serviceUnit > 0 ? s.serviceUnit : 1,
    quantity: s.serviceQuantity != null && s.serviceQuantity > 0 ? s.serviceQuantity : 1,
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

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerListItem[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  const [selectedTechnician, setSelectedTechnician] = useState<EmployeeListItem | null>(null);
  const [technicianFitsWindow, setTechnicianFitsWindow] = useState(true);
  const [technicianListLoading, setTechnicianListLoading] = useState(false);

  const [selectedServiceItems, setSelectedServiceItems] = useState<ServiceItemListItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const customerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jobToEditRef = useRef(jobToEdit);
  jobToEditRef.current = jobToEdit;

  const isEditMode = Boolean(jobToEdit);

  const totalServiceMins = React.useMemo(
    () =>
      selectedServiceItems.reduce(
        (sum, s) =>
          sum +
          s.duration *
          Math.max(1, s.unit > 0 ? s.unit : 1) *
          Math.max(1, s.quantity > 0 ? s.quantity : 1),
        0
      ),
    [selectedServiceItems]
  );

  const effectiveEndTime = React.useMemo(() => {
    if (!date || !startTime) return "";
    if (totalServiceMins <= 0) return "";
    return addMinutesToHhMm(date, startTime, totalServiceMins);
  }, [date, startTime, totalServiceMins]);

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

  const resetForm = useCallback(() => {
    setDate("");
    setStartTime("");
    setCustomerSearch("");
    setCustomerResults([]);
    setSelectedCustomer(null);
    setSelectedTechnician(null);
    setTechnicianFitsWindow(true);
    setTechnicianListLoading(false);
    setSelectedServiceItems([]);
    setNotes("");
    setSubmitError(null);
  }, []);

  const populateFromJob = useCallback((job: Job, cid: string) => {
    setDate(job.date);
    setStartTime(job.startTime);
    setNotes(job.notes ?? "");
    setSubmitError(null);
    setCustomerSearch("");
    setCustomerResults([]);
    setCustomerDropdownOpen(false);
    setSelectedCustomer(
      job.customerId ? jobToCustomerPlaceholder(job, cid) : null
    );
    setSelectedTechnician(
      job.technicianId ? jobToTechnicianPlaceholder(job, cid) : null
    );
    setSelectedServiceItems(
      (job.services ?? []).map((line) => jobServiceLineToListItem(line))
    );
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
          date,
          startTime,
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
          date,
          startTime,
          status: "scheduled",
          serviceItemIds: selectedServiceItems.map((s) => s.id),
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
    date &&
    startTime &&
    selectedServiceItems.length > 0 &&
    totalServiceMins > 0 &&
    technicianFitsWindow &&
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
        {selectedTechnician &&
          !technicianListLoading &&
          !technicianFitsWindow &&
          date &&
          startTime &&
          totalServiceMins > 0 && (
            <p className="text-p mb-4 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {isEditMode
                ? "This technician is not available for the updated date, time, and services. Clear the technician and pick someone else, or adjust the schedule."
                : "This technician is not available for this window. Clear the technician and pick someone else, or adjust the schedule."}
            </p>
          )}
        {/* Customer search & select */}
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

        {/* Date */}
        <div className="mt-4">
          <div className="flex items-center gap-x-1.5">
            <div>
              <HiOutlineCalendar className="size-6 text-neutral-800" />
            </div>
            <h2 className="text-p text-neutral-800">
              Date
            </h2>
          </div>
          <DatePicker
            id="new-job-date"
            value={date}
            onChange={setDate}
            popoverRole="dialog"
          />
        </div>

        {/* Start time; end is derived from service line durations on the server */}
        <div className="mt-4">
          <div className="flex items-center gap-x-1.5">
            <div>
              <HiOutlineClock className="size-6 text-neutral-800" />
            </div>
            <h2 className="text-p text-neutral-800">
              Time
            </h2>
          </div>
          <TimePicker
            id="new-job-start-time"
            value={startTime}
            onChange={setStartTime}
            popoverRole="dialog"
            emptyLabel="Pick a time"
            aria-label="Job start time"
          />
        </div>

        <NewJobServiceBookSection
          key={jobToEdit?.id ?? "new"}
          companyId={companyId}
          isOpen={isOpen}
          value={selectedServiceItems}
          onChange={setSelectedServiceItems}
        />

        <TechnicianSearch
          isOpen={isOpen}
          companyId={companyId}
          date={date}
          startTime={startTime}
          effectiveEndTime={effectiveEndTime}
          totalServiceMins={totalServiceMins}
          jobsForOverlap={jobsForOverlap}
          value={selectedTechnician}
          onChange={setSelectedTechnician}
          onFitsWindowChange={setTechnicianFitsWindow}
          onLoadingChange={setTechnicianListLoading}
        />

        <div className="mt-4 flex flex-col">
          <div className="flex items-center gap-x-2">
            <div>
              <HiOutlineDocumentText className="size-6 text-neutral-800" />
            </div>
            <h2 className="text-h6 font-bold text-neutral-800">
              Notes
            </h2>
          </div>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2 rounded-lg py-2 px-3 border text-neutral-800 bg-neutral-50 border-neutral-300 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </Modal>
  );
}
