"use client";

import { LuBookPlus, LuEllipsisVertical, LuPencil, LuTrash2, LuExternalLink, LuALargeSmall } from "react-icons/lu";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Modal from "../ui/Modal";
import ActionMenu from "../ui/ActionMenu";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { createServiceBook, getServiceBooks, updateServiceBook, deleteServiceBook, type ServiceBookItem } from "@/lib/api/service";
import { slugify } from "@/lib/utils/slug";

export default function Pricebook() {
  const companyId = useSelector((state: RootState) => selectCurrentCompanyId(state));
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serviceBooks, setServiceBooks] = useState<ServiceBookItem[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<ServiceBookItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<ServiceBookItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  useEffect(() => {
    if (searchParams.get("newServiceBook") !== "1") return;
    queueMicrotask(() => {
      setTitle("");
      setError(null);
      setIsOpen(true);
      router.replace("/services", { scroll: false });
    });
  }, [searchParams, router]);

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
      const createRes = await createServiceBook(companyId, trimmedTitle);
      const res = await getServiceBooks(companyId);
      setServiceBooks(res.serviceBooks ?? []);
      handleClose();
      const created = createRes.serviceBook;
      if (created) {
        const bookSlug = created.name ? slugify(created.name) : created.id;
        router.push(`/services/${bookSlug}`);
      }
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
      <div className="hidden sm:flex items-end justify-between">
        <h1 className="text-neutral-900 text-h4 font-bold">
          Services
        </h1>
        <button
          type="button"
          onClick={handleOpen}
          className="bg-primary text-neutral-200 text-p font-bold py-3 px-4 rounded-lg flex items-center gap-x-2 cursor-pointer transition-colors hover:bg-primary/90 hover:text-neutral-50"
        >
          <div>
            <LuBookPlus className="size-6.5" />
          </div>
          Create Servicebook
        </button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="New Servicebook"
        primaryAction={{
          label: loading ? "Creating..." : "Create Servicebook",
          onClick: handleConfirm,
          disabled: loading,
        }}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-x-2">
            <LuALargeSmall className="size-6" />
            <label htmlFor="service-book-title" className="text-neutral-800">Title</label>
          </div>
          <input
            type="text"
            id="service-book-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Air Duct Cleaning"
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

      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          if (!editLoading) {
            setEditModalOpen(false);
            setEditingBook(null);
            setEditName("");
            setEditError(null);
          }
        }}
        title="Update Servicebook"
        primaryAction={{
          label: editLoading ? "Updating..." : "Save Servicebook",
          disabled: !editName.trim() || editLoading,
          onClick: async () => {
            const trimmed = editName.trim();
            if (!trimmed || !companyId || !editingBook) return;
            setEditError(null);
            setEditLoading(true);
            try {
              await updateServiceBook(companyId, trimmed, editingBook.id);
              const res = await getServiceBooks(companyId);
              setServiceBooks(res.serviceBooks ?? []);
              setEditModalOpen(false);
              setEditingBook(null);
              setEditName("");
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "response" in err
                  ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                  : err instanceof Error
                    ? err.message
                    : "Failed to update service book.";
              setEditError(message ?? "Failed to update service book.");
            } finally {
              setEditLoading(false);
            }
          },
        }}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const trimmed = editName.trim();
            if (!trimmed || !companyId || !editingBook) return;
            setEditError(null);
            setEditLoading(true);
            try {
              await updateServiceBook(companyId, trimmed, editingBook.id);
              const res = await getServiceBooks(companyId);
              setServiceBooks(res.serviceBooks ?? []);
              setEditModalOpen(false);
              setEditingBook(null);
              setEditName("");
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "response" in err
                  ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                  : err instanceof Error
                    ? err.message
                    : "Failed to update service book.";
              setEditError(message ?? "Failed to update service book.");
            } finally {
              setEditLoading(false);
            }
          }}
          className="space-y-4"
        >
          {editError && (
            <p className="text-sm text-red-600 bg-red-50 py-2 px-3 rounded-lg" role="alert">
              {editError}
            </p>
          )}
          <div>
            <div className="flex items-center gap-x-2">
              <LuALargeSmall className="size-6" />
              <label htmlFor="service-book-title" className="text-neutral-800">Name</label>
            </div>
            <input
              id="edit-service-book-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Service book name"
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 mt-1 px-3 py-2 text-neutral-800 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={editLoading}
              autoFocus
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteModalOpen(false);
            setBookToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Remove Servicebook"
        primaryAction={{
          label: deleteLoading ? "Deleting..." : "Delete Servicebook",
          disabled: deleteLoading,
          onClick: async () => {
            if (!bookToDelete?.id || !companyId) return;
            setDeleteError(null);
            setDeleteLoading(true);
            try {
              await deleteServiceBook(bookToDelete.id);
              const res = await getServiceBooks(companyId);
              setServiceBooks(res.serviceBooks ?? []);
              setDeleteModalOpen(false);
              setBookToDelete(null);
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "response" in err
                  ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                  : err instanceof Error
                    ? err.message
                    : "Failed to delete service book.";
              setDeleteError(message ?? "Failed to delete service book.");
            } finally {
              setDeleteLoading(false);
            }
          },
        }}
      >
        <div className="flex flex-col gap-2">
          <p className="text-neutral-800 text-p">
            Are you sure you want to delete <strong>{bookToDelete?.name ?? "Untitled"}</strong>? This action cannot be undone.
          </p>
          {deleteError && (
            <p className="text-sm text-red-600" role="alert">
              {deleteError}
            </p>
          )}
        </div>
      </Modal>

      <div className="sm:mt-4">
        {loadingBooks ? (
          <div className="flex flex-col items-center justify-center">
            <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
            <p className="text-p font-bold mt-2 text-neutral-600">Loading servicebooks...</p>
          </div>
        ) : serviceBooks.length === 0 ? (
          <p className="text-neutral-600 text-p">No service books yet. Create one to get started.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {serviceBooks.map((book) => {
              const name = book.name ?? "Untitled";
              const slug = name ? slugify(name) : book.id;
              const href = `/services/${slug}`;
              const menuItems = [
                {
                  label: "Open",
                  icon: LuExternalLink,
                  onClick: () => router.push(href),
                },
                {
                  label: "Edit",
                  icon: LuPencil,
                  onClick: () => {
                    setEditingBook(book);
                    setEditName(book.name ?? "Untitled");
                    setEditError(null);
                    setEditModalOpen(true);
                  },
                },
                {
                  label: "Delete",
                  icon: LuTrash2,
                  onClick: () => {
                    setBookToDelete(book);
                    setDeleteError(null);
                    setDeleteModalOpen(true);
                  },
                },
              ];
              return (
                <li key={book.id} className="flex items-center gap-x-2 rounded-lg px-4 border text-neutral-600 border-neutral-400 bg-neutral-50 transition-colors hover:border-primary hover:bg-neutral-100 hover:text-neutral-800">
                  <Link className="w-full py-4" href={href}>{name}</Link>
                  <ActionMenu
                    items={menuItems}
                    trigger={<LuEllipsisVertical className="size-6" />}
                    triggerLabel={`Actions for ${name}`}
                    align="right"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}