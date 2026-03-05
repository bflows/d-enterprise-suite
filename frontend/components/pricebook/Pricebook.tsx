"use client";

import { LuBookPlus/* , LuEllipsisVertical */ } from "react-icons/lu";
import Link from "next/link";
import Modal from "../ui/Modal";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { createServiceBook, getServiceBooks, type ServiceBookItem } from "@/lib/api/service";
import { slugify } from "@/lib/utils/slug";

export default function Pricebook() {
  const companyId = useSelector((state: RootState) => selectCurrentCompanyId(state));
  const [serviceBooks, setServiceBooks] = useState<ServiceBookItem[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setServiceBooks([]);
      return;
    }
    let cancelled = false;
    setLoadingBooks(true);
    getServiceBooks(companyId)
      .then((res) => {
        if (!cancelled) setServiceBooks(res.serviceBooks ?? []);
      })
      .catch(() => {
        if (!cancelled) setServiceBooks([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingBooks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleOpen = () => {
    setTitle("");
    setError(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!loading) {
      setTitle("");
      setError(null);
      setIsOpen(false);
    }
  };

  const handleConfirm = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    if (!companyId) {
      setError("No company selected. Please select a company.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await createServiceBook(companyId, trimmedTitle);
      const res = await getServiceBooks(companyId);
      setServiceBooks(res.serviceBooks ?? []);
      handleClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
            ? err.message
            : "Failed to create service book.";
      setError(message ?? "Failed to create service book.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-neutral-900 text-h4 font-bold">Services</h1>

        <button
          type="button"
          onClick={handleOpen}
          className="bg-primary text-neutral-200 text-p font-bold py-3 px-4 rounded-lg flex items-center gap-x-2 cursor-pointer transition-colors hover:bg-primary/90 hover:text-neutral-50"
        >
          <div>
            <LuBookPlus className="size-6" />
          </div>
          New Service Book
        </button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="New Service Book"
        primaryAction={{
          label: loading ? "Creating…" : "Confirm",
          onClick: handleConfirm,
          disabled: loading,
        }}
      >
        <div className="flex flex-col">
          <label htmlFor="service-book-title">Title</label>
          <input
            type="text"
            id="service-book-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="E.g. HVAC, Air Duct Cleaning, Plumbing"
            className="bg-neutral-50 text-neutral-800 text-p px-4 py-2 mt-1 rounded-lg border border-neutral-400 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </Modal>

      <div className="mt-4">
        {loadingBooks ? (
          <div className="">
            <div className="flex items-center gap-x-4">
              <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
              <p className="text-neutral-800 text-p mt-2">
                Loading service books...
              </p>
            </div>
          </div>
        ) : serviceBooks.length === 0 ? (
          <p className="text-neutral-600 text-p">No service books yet. Create one above.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {serviceBooks.map((book) => {
              const name = book.name ?? "Untitled";
              const slug = name ? slugify(name) : book.id;
              return (
                <li key={book.id}>
                  <Link
                    href={`/services/${slug}`}
                    className="block rounded-lg border border-neutral-300 bg-neutral-50 p-4 text-neutral-900 font-medium transition-colors hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {name}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}