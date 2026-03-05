"use client";

import React, { useState, useCallback, useEffect } from "react";
import type { Job, JobStatus } from "@/lib/calendar/types";
import Modal from "@/components/ui/Modal";
import { LuPencil, LuTrash2 } from "react-icons/lu";

export interface JobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  isEditMode: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSave: (job: Job) => void;
  onDelete: (id: string) => void;
}

const STATUS_OPTIONS: JobStatus[] = ["scheduled", "in_progress", "completed", "cancelled"];

export default function JobDetailModal({
  job,
  isOpen,
  isEditMode,
  onClose,
  onEdit,
  onSave,
  onDelete,
}: JobDetailModalProps) {
  const [form, setForm] = useState<Job | null>(job);

  useEffect(() => {
    setForm(job);
  }, [job]);

  const updateForm = useCallback(
    (updates: Partial<Job>) => {
      if (!job) return;
      setForm({ ...job, ...updates });
    },
    [job]
  );

  if (!job) return null;

  const currentForm = form ?? job;
  const handleSave = () => onSave(currentForm);
  const handleDelete = () => {
    if (confirm("Delete this job?")) onDelete(job.id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Job" : "Job Details"}
      cancelLabel={isEditMode ? "Cancel" : "Close"}
      closeOnBackdropClick={false}
      primaryAction={
        isEditMode
          ? { label: "Save", onClick: handleSave }
          : undefined
      }
    >
      <div className="space-y-4">
        {isEditMode ? (
          <>
            <div>
              <label className="block text-small font-semibold text-neutral-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={currentForm.title}
                onChange={(e) => updateForm({ title: e.target.value })}
                className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-small font-semibold text-neutral-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={currentForm.date}
                  onChange={(e) => updateForm({ date: e.target.value })}
                  className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-small font-semibold text-neutral-700 mb-1">
                  Status
                </label>
                <select
                  value={currentForm.status}
                  onChange={(e) => updateForm({ status: e.target.value as JobStatus })}
                  className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-small font-semibold text-neutral-700 mb-1">
                  Start time
                </label>
                <input
                  type="time"
                  value={currentForm.startTime}
                  onChange={(e) => updateForm({ startTime: e.target.value })}
                  className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-small font-semibold text-neutral-700 mb-1">
                  End time
                </label>
                <input
                  type="time"
                  value={currentForm.endTime ?? ""}
                  onChange={(e) =>
                    updateForm({ endTime: e.target.value || undefined })
                  }
                  className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-small font-semibold text-neutral-700 mb-1">
                Customer
              </label>
              <input
                type="text"
                value={currentForm.customerName ?? ""}
                onChange={(e) => updateForm({ customerName: e.target.value || undefined })}
                className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-small font-semibold text-neutral-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={currentForm.address ?? ""}
                onChange={(e) => updateForm({ address: e.target.value || undefined })}
                className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-small font-semibold text-neutral-700 mb-1">
                Notes
              </label>
              <textarea
                value={currentForm.notes ?? ""}
                onChange={(e) => updateForm({ notes: e.target.value || undefined })}
                rows={3}
                className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-small text-neutral-500">Title</p>
              <p className="text-p font-semibold text-neutral-900">{job.title}</p>
            </div>
            <div className="flex gap-4 flex-wrap">
              <div>
                <p className="text-small text-neutral-500">Date</p>
                <p className="text-p text-neutral-900">{job.date}</p>
              </div>
              <div>
                <p className="text-small text-neutral-500">Time</p>
                <p className="text-p text-neutral-900">
                  {job.startTime}
                  {job.endTime ? ` – ${job.endTime}` : ""}
                </p>
              </div>
              <div>
                <p className="text-small text-neutral-500">Status</p>
                <p className="text-p capitalize text-neutral-900">
                  {job.status.replace("_", " ")}
                </p>
              </div>
            </div>
            {job.customerName && (
              <div>
                <p className="text-small text-neutral-500">Customer</p>
                <p className="text-p text-neutral-900">{job.customerName}</p>
              </div>
            )}
            {job.address && (
              <div>
                <p className="text-small text-neutral-500">Address</p>
                <p className="text-p text-neutral-900">{job.address}</p>
              </div>
            )}
            {job.notes && (
              <div>
                <p className="text-small text-neutral-500">Notes</p>
                <p className="text-p text-neutral-900 whitespace-pre-wrap">{job.notes}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-300">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-p font-medium text-neutral-200 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <LuPencil className="size-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-400 bg-neutral-50 px-4 py-2 text-p font-medium text-neutral-700 hover:bg-red-50 hover:text-secondary hover:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary"
              >
                <LuTrash2 className="size-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
