"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { Job, JobStatus } from "@/lib/calendar/types";
import Modal from "@/components/ui/Modal";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import { searchEmployees } from "@/lib/api/company";
import type { EmployeeListItem } from "@/lib/api/company";

export interface JobDetailModalProps {
  companyId?: string;
  job: Job | null;
  isOpen: boolean;
  isEditMode: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSave: (job: Job) => void;
  onRequestDelete: (job: Job) => void;
  saveLoading?: boolean;
  saveError?: string | null;
}

const STATUS_OPTIONS: JobStatus[] = ["scheduled", "in_progress", "completed", "cancelled"];

function technicianDisplayName(t: EmployeeListItem): string {
  return [t.user.firstName, t.user.lastName].filter(Boolean).join(" ") || t.user.email || "";
}

export default function JobDetailModal({
  companyId,
  job,
  isOpen,
  isEditMode,
  onClose,
  onEdit,
  onSave,
  onRequestDelete,
  saveLoading = false,
  saveError,
}: JobDetailModalProps) {
  const [form, setForm] = useState<Job | null>(job);
  const [technicianSearchQuery, setTechnicianSearchQuery] = useState("");
  const [technicianSuggestions, setTechnicianSuggestions] = useState<EmployeeListItem[]>([]);
  const [technicianSuggestionsOpen, setTechnicianSuggestionsOpen] = useState(false);
  const [technicianSearchLoading, setTechnicianSearchLoading] = useState(false);
  const [technicianInputTouched, setTechnicianInputTouched] = useState(false);
  const technicianInputRef = useRef<HTMLDivElement>(null);

  // Search technicians only after user has typed or cleared the input (not on modal open or focus)
  useEffect(() => {
    if (!companyId || !isOpen || !isEditMode || !technicianInputTouched) return;
    const q = technicianSearchQuery.trim();
    const timer = setTimeout(() => {
      setTechnicianSearchLoading(true);
      searchEmployees(companyId, q)
        .then((res) => {
          const techs = (res.employees ?? []).filter(
            (e) => e.roleSlug === "technician"
          );
          setTechnicianSuggestions(techs);
          setTechnicianSuggestionsOpen(true);
        })
        .catch(() => setTechnicianSuggestions([]))
        .finally(() => setTechnicianSearchLoading(false));
    }, q ? 200 : 0);
    return () => clearTimeout(timer);
  }, [companyId, isOpen, isEditMode, technicianInputTouched, technicianSearchQuery]);

  useEffect(() => {
    if (!technicianSuggestionsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (technicianInputRef.current && !technicianInputRef.current.contains(e.target as Node)) {
        setTechnicianSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [technicianSuggestionsOpen]);

  const updateForm = useCallback((updates: Partial<Job>) => {
    setForm((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  if (!job) return null;

  const currentForm = form ?? job;
  const handleSave = () => onSave(currentForm);
  const handleRequestDelete = () => {
    onRequestDelete(job);
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
          ? {
              label: saveLoading ? "Saving…" : "Save",
              onClick: handleSave,
              disabled: saveLoading,
            }
          : undefined
      }
    >
      <div className="space-y-4">
        {saveError && (
          <p className="text-p text-secondary bg-red-50 py-2 px-3 rounded-lg" role="alert">
            {saveError}
          </p>
        )}
        {isEditMode ? (
          <>
            <div>
              <label className="block text-small font-semibold text-neutral-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={currentForm.title ?? ""}
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
            {companyId && (
              <div ref={technicianInputRef} className="relative">
                <label className="block text-small font-semibold text-neutral-700 mb-1">
                  Technician
                </label>
                <input
                  type="text"
                  value={
                    technicianSearchQuery !== ""
                      ? technicianSearchQuery
                      : technicianInputTouched
                        ? ""
                        : (currentForm.technicianName ?? "")
                  }
                  onChange={(e) => {
                    setTechnicianInputTouched(true);
                    setTechnicianSearchQuery(e.target.value);
                  }}
                  placeholder="Search to reassign technician…"
                  className="w-full rounded-lg border border-neutral-400 px-3 py-2 text-p focus:outline-none focus:ring-2 focus:ring-primary"
                  autoComplete="off"
                  aria-expanded={technicianSuggestionsOpen}
                  aria-haspopup="listbox"
                  aria-controls="technician-suggestions"
                />
                {(technicianSuggestionsOpen || technicianSearchLoading) && technicianInputTouched && (
                  <div
                    id="technician-suggestions"
                    role="listbox"
                    className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-neutral-300 bg-white shadow-lg py-1"
                  >
                    {technicianSearchLoading ? (
                      <p className="px-3 py-3 text-p text-neutral-500">Searching…</p>
                    ) : technicianSuggestions.length > 0 ? (
                      <ul className="list-none py-0 my-0">
                        {technicianSuggestions.map((t) => (
                          <li
                            key={t.id}
                            role="option"
                            tabIndex={-1}
                            className="px-3 py-2 text-p text-neutral-900 cursor-pointer hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              updateForm({
                                technicianId: t.id,
                                technicianName: technicianDisplayName(t),
                              });
                              setTechnicianSearchQuery("");
                              setTechnicianInputTouched(false);
                              setTechnicianSuggestionsOpen(false);
                              setTechnicianSuggestions([]);
                            }}
                          >
                            {technicianDisplayName(t)}
                          </li>
                        ))}
                      </ul>
                    ) : technicianSearchQuery.trim() !== "" ? (
                      <p className="px-3 py-3 text-small text-neutral-500">No technicians found. Try a different search.</p>
                    ) : null}
                  </div>
                )}
              </div>
            )}
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
                readOnly
                className="w-full rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-p text-neutral-700 cursor-default"
                aria-label="Address (from customer, read-only)"
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
              <p className="text-p font-semibold text-neutral-900">{job.title?.trim() || job.customerName || "—"}</p>
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
              {(job.technicianName != null && job.technicianName !== "") || job.technicianId ? (
                <div>
                  <p className="text-small text-neutral-500">Technician</p>
                  <p className="text-p text-neutral-900">
                    {job.technicianName ?? "—"}
                  </p>
                </div>
              ) : null}
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
            {job.services && job.services.length > 0 && (
              <div>
                <p className="text-small text-neutral-500 mb-2">Services</p>
                <div className="rounded-lg border border-neutral-300 overflow-hidden">
                  <table className="w-full text-left text-p border-collapse">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-300">
                        <th className="py-2 px-3 font-semibold text-neutral-700">Service</th>
                        <th className="py-2 px-3 font-semibold text-neutral-700">Quantity / unit</th>
                        <th className="py-2 px-3 font-semibold text-neutral-700 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.services.map((s) => (
                        <tr key={s.id} className="border-b border-neutral-200 last:border-b-0">
                          <td className="py-2 px-3 text-neutral-900">
                            {s.name ?? (s as { title?: string }).title ?? "—"}
                          </td>
                          <td className="py-2 px-3 text-neutral-900">
                            {s.quantityOrUnit ?? (s as { unit?: number }).unit ?? "—"}
                          </td>
                          <td className="py-2 px-3 text-neutral-900 text-right">
                            ${Number(s.price ?? 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                onClick={handleRequestDelete}
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
