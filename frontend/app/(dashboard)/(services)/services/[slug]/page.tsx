"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { getServiceBooks, type ServiceBookItem } from "@/lib/api/service";
import { slugify } from "@/lib/utils/slug";
import { LuFolderPlus } from "react-icons/lu";
import Modal from "@/components/ui/Modal";

export type CategoryItem = { id: string; name: string };

function getSlugForBook(book: ServiceBookItem): string {
  const name = book.name ?? "";
  return name ? slugify(name) : book.id;
}

export default function ServiceBookPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const companyId = useSelector((state: RootState) => selectCurrentCompanyId(state));
  const [serviceBook, setServiceBook] = useState<ServiceBookItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categories, setCategories] = useState<CategoryItem[]>([]);

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

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center gap-x-4">
          <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <p className="text-neutral-800 text-p mt-2">
            Loading service book...
          </p>
        </div>
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
      <div className="flex items-center justify-between">
        <h1 className="text-neutral-900 text-h4 font-bold">
          {name}
        </h1>

        <button
          onClick={() => setCreateCategoryOpen(true)}
          className="bg-primary text-neutral-200 text-p font-bold py-3 px-4 rounded-lg flex items-center gap-x-2 cursor-pointer transition-colors hover:bg-primary/90 hover:text-neutral-50"
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
        }}
        title="Create Category"
        primaryAction={{
          label: "Create",
          disabled: !categoryName.trim(),
          onClick: () => {
            const name = categoryName.trim();
            if (!name) return;
            setCategories((prev) => [
              ...prev,
              { id: crypto.randomUUID(), name },
            ]);
            setCreateCategoryOpen(false);
            setCategoryName("");
          },
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = categoryName.trim();
            if (!name) return;
            setCategories((prev) => [
              ...prev,
              { id: crypto.randomUUID(), name },
            ]);
            setCreateCategoryOpen(false);
            setCategoryName("");
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="category-name"
              className="block text-sm font-medium text-neutral-800 mb-1"
            >
              Name
            </label>
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

      {categories.length > 0 && (
        <div className="mt-4">
          <ul className="space-y-2">
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="text-neutral-700 w-fit min-w-24 text-p py-2 px-3 rounded-lg bg-neutral-100 border border-neutral-300"
              >
                {cat.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
