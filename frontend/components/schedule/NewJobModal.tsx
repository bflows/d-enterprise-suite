"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import type { Job } from "@/lib/calendar/types";
import { addMinutesToHhMm } from "@/lib/calendar/types";
import type { CustomerListItem } from "@/lib/api/customers";
import type { EmployeeListItem } from "@/lib/api/company";
import type { ServiceItemListItem } from "@/lib/api/service";
import JobServiceBook from "@/components/schedule/JobServiceBook";
import CustomerPicker from "@/components/schedule/CustomerPicker";
import TechnicianSearch from "@/components/schedule/TechnicianSearch";
import { createJob, mapApiJobToJob, updateJob } from "@/lib/api/jobs";
import { HiOutlineCalendar, HiOutlineClock, HiOutlineDocumentText } from "react-icons/hi2";

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
  const companyId = useSelector((state: RootState) =>
    selectCurrentCompanyId(state)
  );

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);

  const [selectedTechnician, setSelectedTechnician] = useState<EmployeeListItem | null>(null);
  const [technicianFitsWindow, setTechnicianFitsWindow] = useState(true);
  const [technicianListLoading, setTechnicianListLoading] = useState(false);

  const [selectedServiceItems, setSelectedServiceItems] = useState<ServiceItemListItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

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

  const resetForm = useCallback(() => {
    setDate("");
    setStartTime("");
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
        <CustomerPicker
          key={`${companyId ?? ""}-${selectedCustomer?.id ?? "none"}`}
          isOpen={isOpen}
          companyId={companyId}
          value={selectedCustomer}
          onChange={setSelectedCustomer}
          allowClear={!isEditMode}
          onModalClose={onClose}
        />

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

        <JobServiceBook
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
          <div className="flex items-center gap-x-1.5">
            <div>
              <HiOutlineDocumentText className="size-6 text-neutral-800" />
            </div>
            <h2 className="text-p text-neutral-800">Notes</h2>
          </div>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`mt-2 rounded-lg py-2 px-3 border text-neutral-800 bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary ${notes.length > 0 ? "border-neutral-300" : "border-neutral-200"
              }`}
          />
        </div>
      </div>
    </Modal>
  );
}
