"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Job, JobStatus } from "@/lib/calendar/types";
import Modal from "@/components/ui/Modal";
import JobDetailView from "./JobDetailView";
import { LuPencil, LuTrash2, LuX } from "react-icons/lu";
import { searchEmployees } from "@/lib/api/company";
import type { EmployeeListItem } from "@/lib/api/company";
import {
  getServiceBooks,
  getServiceItemsByCategory,
  type ServiceBookItem,
  type ServiceBookCategoryItem,
  type ServiceItemListItem,
} from "@/lib/api/service";
import { formatUsdFromCents } from "@/lib/money";

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

const STATUS_OPTIONS: JobStatus[] = [
  "scheduled",
  "en_route",
  "in_progress",
  "completed",
  "cancelled",
];

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

  // Service Book picker (edit mode)
  const [serviceBooks, setServiceBooks] = useState<ServiceBookItem[]>([]);
  const [selectedServiceBook, setSelectedServiceBook] = useState<ServiceBookItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ServiceBookCategoryItem | null>(null);
  const [categoryServiceItems, setCategoryServiceItems] = useState<ServiceItemListItem[]>([]);
  const [serviceBooksLoading, setServiceBooksLoading] = useState(false);
  const [categoryItemsLoading, setCategoryItemsLoading] = useState(false);
  const [servicesPickerView, setServicesPickerView] = useState<"books" | "categories" | "items" | null>(null);

  // Sync form when job or isOpen changes so we have latest job data (e.g. after save).
  // Defer setState to avoid synchronous setState in effect (cascading renders).
  useEffect(() => {
    if (!job || !isOpen) return;
    const id = setTimeout(() => setForm(job), 0);
    return () => clearTimeout(id);
  }, [job, isOpen]);

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

  // Load service books when user opens the Service Book picker (edit mode)
  useEffect(() => {
    if (!isOpen || !companyId || !isEditMode || servicesPickerView !== "books") return;
    queueMicrotask(() => setServiceBooksLoading(true));
    getServiceBooks(companyId)
      .then((res) => setServiceBooks(res.serviceBooks ?? []))
      .catch(() => setServiceBooks([]))
      .finally(() => setServiceBooksLoading(false));
  }, [isOpen, companyId, isEditMode, servicesPickerView]);

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

  const updateForm = useCallback((updates: Partial<Job>) => {
    setForm((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  if (!job) return null;

  const currentForm = form ?? job;
  const currentServices = currentForm.services ?? [];
  const handleSave = () => {
    const payload: Job = {
      ...currentForm,
      serviceItemIds: currentServices.map((s) => s.id),
    };
    onSave(payload);
  };
  const handleRequestDelete = () => {
    onRequestDelete(job);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Job" : "Job Details"}
      closeOnBackdropClick={false}
      hideCancelButton
      footerStartContent={
        !isEditMode ? (
          <div className="flex justify-end flex-wrap gap-2 w-full">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-lg cursor-pointer bg-primary px-4 py-2 text-p font-medium text-neutral-200 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <LuPencil className="size-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={handleRequestDelete}
              className="inline-flex items-center gap-2 rounded-lg cursor-pointer border border-neutral-400 bg-neutral-50 px-4 py-2 text-p font-medium text-neutral-700 hover:bg-red-50 hover:text-secondary hover:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <LuTrash2 className="size-4" />
              Delete
            </button>
          </div>
        ) : undefined
      }
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
                  role="combobox"
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
                            aria-selected={false}
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

            {/* Services: current list + add from Service Book */}
            <div>
              <label className="block text-small font-semibold text-neutral-700 mb-1">
                Services
              </label>
              {currentServices.length > 0 ? (
                <div className="rounded-lg border border-neutral-300 overflow-hidden mb-2">
                  <table className="w-full text-left text-p border-collapse">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-300">
                        <th className="py-2 px-3 font-semibold text-neutral-700">Service</th>
                        <th className="py-2 px-3 font-semibold text-neutral-700">Qty</th>
                        <th className="py-2 px-3 font-semibold text-neutral-700 text-right">Price</th>
                        <th className="w-9" aria-label="Remove" />
                      </tr>
                    </thead>
                    <tbody>
                      {currentServices.map((s) => (
                        <tr key={s.id} className="border-b border-neutral-200 last:border-b-0">
                          <td className="py-2 px-3 text-neutral-900">{s.name ?? "—"}</td>
                          <td className="py-2 px-3 text-neutral-900">{s.quantity ?? "—"}</td>
                          <td className="py-2 px-3 text-neutral-900 text-right">
                            {formatUsdFromCents(Number(s.price ?? 0))}
                          </td>
                          <td className="py-1 px-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateForm({
                                  services: currentServices.filter((x) => x.id !== s.id),
                                })
                              }
                              className="p-1.5 rounded text-neutral-500 hover:bg-red-50 hover:text-secondary focus:outline-none focus:ring-2 focus:ring-secondary"
                              aria-label={`Remove ${s.name ?? "service"}`}
                            >
                              <LuX className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-small text-neutral-500 mb-2">No services added. Use Service Book below to add.</p>
              )}

              {!servicesPickerView ? (
                <button
                  type="button"
                  onClick={() => setServicesPickerView("books")}
                  className="text-p text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
                >
                  + Add from Service Book
                </button>
              ) : (
                <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-3 space-y-2">
                  {servicesPickerView === "books" && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-small font-semibold text-neutral-700">Select Service Book</span>
                        <button
                          type="button"
                          onClick={() => setServicesPickerView(null)}
                          className="text-small text-neutral-500 hover:underline"
                        >
                          Close
                        </button>
                      </div>
                      {serviceBooksLoading ? (
                        <p className="text-small text-neutral-500">Loading…</p>
                      ) : serviceBooks.length === 0 ? (
                        <p className="text-small text-neutral-500">No service books found.</p>
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
                      <p className="text-small text-neutral-800">
                        {selectedServiceBook.name ?? "Unnamed"} – Select category
                      </p>
                      {(selectedServiceBook.catories?.length ?? 0) === 0 ? (
                        <p className="text-small text-neutral-500">No categories in this book.</p>
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
                      <p className="text-small text-neutral-800">
                        {selectedCategory.name} – Click to add service
                      </p>
                      {categoryItemsLoading ? (
                        <p className="text-small text-neutral-500">Loading…</p>
                      ) : categoryServiceItems.length === 0 ? (
                        <p className="text-small text-neutral-500">No service items in this category.</p>
                      ) : (
                        <ul className="space-y-1 max-h-48 overflow-y-auto">
                          {categoryServiceItems.map((item) => {
                            const alreadyAdded = currentServices.some((s) => s.id === item.id);
                            return (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  disabled={alreadyAdded}
                                  onClick={() => {
                                    if (alreadyAdded) return;
                                    updateForm({
                                      services: [
                                        ...currentServices,
                                        {
                                          id: item.id,
                                          name: item.title,
                                          quantity: item.unit ?? 1,
                                          price: item.price,
                                        },
                                      ],
                                    });
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
                                      {formatUsdFromCents(item.price)}
                                    </span>
                                  )}
                                  {alreadyAdded && <span className="text-small ml-2">(added)</span>}
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
          </>
        ) : (
          <JobDetailView job={job} />
        )}
      </div>
    </Modal>
  );
}
