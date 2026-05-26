"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { getServiceBooks, createCategory, updateCategory, deleteCategory, type ServiceBookItem, type ServiceBookCategoryItem } from "@/lib/api/service";
import { slugify } from "@/lib/utils/slug";
import { LuFolderPlus, LuEllipsisVertical, LuExternalLink, LuPencil, LuTrash2, LuALargeSmall } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import ActionMenu from "@/components/ui/ActionMenu";

function getSlugForBook(book: ServiceBookItem): string {
  const name = book.name ?? "";
  return name ? slugify(name) : book.id;
}

function getSlugForCategory(name: string): string {
  return slugify(name);
}

export default function ServiceBookPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const companyId = useSelector((state: RootState) => selectCurrentCompanyId(state));
  const [serviceBook, setServiceBook] = useState<ServiceBookItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [createCategoryLoading, setCreateCategoryLoading] = useState(false);
  const [createCategoryError, setCreateCategoryError] = useState<string | null>(null);

  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceBookCategoryItem | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryLoading, setEditCategoryLoading] = useState(false);
  const [editCategoryError, setEditCategoryError] = useState<string | null>(null);

  const [deleteCategoryOpen, setDeleteCategoryOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ServiceBookCategoryItem | null>(null);
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);
  const [deleteCategoryError, setDeleteCategoryError] = useState<string | null>(null);

  const fetchServiceBook = () => {
    if (!companyId || !slug) return;
    getServiceBooks(companyId)
      .then((res) => {
        const match = (res.serviceBooks ?? []).find(
          (book) => getSlugForBook(book) === slug
        );
        setServiceBook(match ?? null);
      })
      .catch(() => setServiceBook(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!companyId || !slug) {
      queueMicrotask(() => {
        setLoading(false);
        setServiceBook(null);
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    getServiceBooks(companyId)
      .then((res) => {
        if (cancelled) return;
        const match = (res.serviceBooks ?? []).find(
          (book) => getSlugForBook(book) === slug
        );
        setServiceBook(match ?? null);
      })
      .catch(() => {
        if (!cancelled) setServiceBook(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, slug]);

  useEffect(() => {
    if (searchParams.get("newCategory") !== "1") return;
    queueMicrotask(() => {
      setCategoryName("");
      setCreateCategoryError(null);
      setCreateCategoryOpen(true);
      router.replace(`/services/${slug}`, { scroll: false });
    });
  }, [searchParams, router, slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
        <p className="text-p font-bold mt-2 text-neutral-600">Loading servicebook...</p>
      </div>
    );
  }

  if (!serviceBook) {
    return (
      <div>
        <p className="text-neutral-600 text-p">Service book not found.</p>
        <Link
          href="/services"
          className="mt-2 inline-block text-primary font-medium hover:underline"
        >
          Back to Services
        </Link>
      </div>
    );
  }

  const name = serviceBook.name ?? "Untitled";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-neutral-900 text-h4 font-bold">
          {name}
        </h1>

        <button
          onClick={() => setCreateCategoryOpen(true)}
          className="bg-primary text-neutral-200 hidden mt-4 sm:mt-0 text-p font-bold py-3 px-4 rounded-lg sm:flex items-center gap-x-2 cursor-pointer transition-colors hover:bg-primary/90 hover:text-neutral-50"
        >
          <div>
            <LuFolderPlus className="size-6" />
          </div>
          Create Category
        </button>
      </div>

      <Modal
        isOpen={createCategoryOpen}
        onClose={() => {
          setCreateCategoryOpen(false);
          setCategoryName("");
          setCreateCategoryError(null);
        }}
        title="Create Category"
        primaryAction={{
          label: createCategoryLoading ? "Creating..." : "Create Category",
          disabled: !categoryName.trim() || createCategoryLoading,
          onClick: async () => {
            const name = categoryName.trim();
            if (!name || !companyId || !serviceBook.id) return;
            setCreateCategoryError(null);
            setCreateCategoryLoading(true);
            try {
              const res = await createCategory(companyId, serviceBook.id, name);
              setCreateCategoryOpen(false);
              setCategoryName("");
              fetchServiceBook();
              const categorySlug = getSlugForCategory(res.category.name);
              router.push(`/services/${slug}/${categorySlug}`);
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "response" in err
                  ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                  : "Failed to create category.";
              setCreateCategoryError(message ?? "Failed to create category.");
            } finally {
              setCreateCategoryLoading(false);
            }
          },
        }}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const name = categoryName.trim();
            if (!name || !companyId || !serviceBook.id) return;
            setCreateCategoryError(null);
            setCreateCategoryLoading(true);
            try {
              const res = await createCategory(companyId, serviceBook.id, name);
              setCreateCategoryOpen(false);
              setCategoryName("");
              fetchServiceBook();
              const categorySlug = getSlugForCategory(res.category.name);
              router.push(`/services/${slug}/${categorySlug}`);
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "response" in err
                  ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                  : "Failed to create category.";
              setCreateCategoryError(message ?? "Failed to create category.");
            } finally {
              setCreateCategoryLoading(false);
            }
          }}
          className="space-y-4"
        >
          {createCategoryError && (
            <p className="text-sm text-red-600 bg-red-50 py-2 px-3 rounded-lg">
              {createCategoryError}
            </p>
          )}
          <div>
            <div className="flex items-center gap-x-2">
              <LuALargeSmall className="size-6" />
              <label htmlFor="service-book-title" className="text-neutral-800">Name</label>
            </div>
            <input
              id="category-name"
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Category name"
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 mt-1 px-3 py-2 text-neutral-800 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
        </form>
      </Modal>

      {serviceBook.catories?.length === 0 && (
        <p className="text-neutral-600 text-p">No categories yet. Create one to get started.</p>
      )}

      {(serviceBook.catories?.length ?? 0) > 0 && (
        <div className="mt-4">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {serviceBook.catories?.map((cat) => {
              const categoryHref = `/services/${slug}/${getSlugForCategory(cat.name)}`;
              const menuItems = [
                {
                  label: "View",
                  icon: LuExternalLink,
                  onClick: () => router.push(categoryHref),
                },
                {
                  label: "Edit",
                  icon: LuPencil,
                  onClick: () => {
                    setEditingCategory(cat);
                    setEditCategoryName(cat.name);
                    setEditCategoryError(null);
                    setEditCategoryOpen(true);
                  },
                },
                {
                  label: "Delete",
                  icon: LuTrash2,
                  onClick: () => {
                    setCategoryToDelete(cat);
                    setDeleteCategoryError(null);
                    setDeleteCategoryOpen(true);
                  },
                },
              ];
              return (
                <li
                  key={cat.id}
                  className="flex items-center gap-x-2 rounded-lg px-4 border text-neutral-600 border-neutral-400 bg-neutral-50 transition-colors hover:border-primary hover:bg-neutral-100 hover:text-neutral-800"
                >
                  <Link className="w-full py-4" href={categoryHref}>
                    {cat.name}
                  </Link>
                  <ActionMenu
                    items={menuItems}
                    trigger={<LuEllipsisVertical className="size-6" />}
                    triggerLabel={`Actions for ${cat.name}`}
                    align="right"
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Modal
        isOpen={editCategoryOpen}
        onClose={() => {
          if (!editCategoryLoading) {
            setEditCategoryOpen(false);
            setEditingCategory(null);
            setEditCategoryName("");
            setEditCategoryError(null);
          }
        }}
        title="Edit Category"
        primaryAction={{
          label: editCategoryLoading ? "Updating..." : "Update Category",
          disabled: !editCategoryName.trim() || editCategoryLoading,
          onClick: async () => {
            const name = editCategoryName.trim();
            if (!name || !editingCategory) return;
            setEditCategoryError(null);
            setEditCategoryLoading(true);
            try {
              await updateCategory(editingCategory.id, name);
              setEditCategoryOpen(false);
              setEditingCategory(null);
              setEditCategoryName("");
              fetchServiceBook();
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "response" in err
                  ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                  : "Failed to update category.";
              setEditCategoryError(message ?? "Failed to update category.");
            } finally {
              setEditCategoryLoading(false);
            }
          },
        }}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const name = editCategoryName.trim();
            if (!name || !editingCategory) return;
            setEditCategoryError(null);
            setEditCategoryLoading(true);
            try {
              await updateCategory(editingCategory.id, name);
              setEditCategoryOpen(false);
              setEditingCategory(null);
              setEditCategoryName("");
              fetchServiceBook();
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "response" in err
                  ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                  : "Failed to update category.";
              setEditCategoryError(message ?? "Failed to update category.");
            } finally {
              setEditCategoryLoading(false);
            }
          }}
          className="space-y-4"
        >
          {editCategoryError && (
            <p className="text-sm text-red-600 bg-red-50 py-2 px-3 rounded-lg" role="alert">
              {editCategoryError}
            </p>
          )}
          <div>
            <div className="flex items-center gap-x-2">
              <LuALargeSmall className="size-6" />
              <label htmlFor="service-book-title" className="text-neutral-800">Name</label>
            </div>
            <input
              id="edit-category-name"
              type="text"
              value={editCategoryName}
              onChange={(e) => setEditCategoryName(e.target.value)}
              placeholder="Category name"
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 mt-1 px-3 py-2 text-neutral-800 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={editCategoryLoading}
              autoFocus
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteCategoryOpen}
        onClose={() => {
          if (!deleteCategoryLoading) {
            setDeleteCategoryOpen(false);
            setCategoryToDelete(null);
            setDeleteCategoryError(null);
          }
        }}
        title="Delete Category"
        primaryAction={{
          label: deleteCategoryLoading ? "Deleting..." : "Delete Category",
          disabled: deleteCategoryLoading,
          onClick: async () => {
            if (!categoryToDelete) return;
            setDeleteCategoryError(null);
            setDeleteCategoryLoading(true);
            try {
              await deleteCategory(categoryToDelete.id);
              setDeleteCategoryOpen(false);
              setCategoryToDelete(null);
              fetchServiceBook();
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "response" in err
                  ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                  : "Failed to delete category.";
              setDeleteCategoryError(message ?? "Failed to delete category.");
            } finally {
              setDeleteCategoryLoading(false);
            }
          },
        }}
      >
        <div className="space-y-4">
          {deleteCategoryError && (
            <p className="text-sm text-red-600 bg-red-50 py-2 px-3 rounded-lg" role="alert">
              {deleteCategoryError}
            </p>
          )}
          <p className="text-neutral-700 text-p">
            {categoryToDelete ? (
              <>
                Are you sure you want to delete the category{" "}
                <strong>{categoryToDelete.name}</strong>? Any service items in this category will
                also be deleted.
              </>
            ) : (
              "No category selected."
            )}
          </p>
        </div>
      </Modal>
    </div>
  );
}
