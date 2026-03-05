"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { getServiceBooks, createServiceItem, type ServiceBookItem, type ServiceItemType } from "@/lib/api/service";
import { slugify } from "@/lib/utils/slug";
import { LuPlus } from "react-icons/lu";
import Modal from "@/components/ui/Modal";

function getSlugForBook(book: ServiceBookItem): string {
  const name = book.name ?? "";
  return name ? slugify(name) : book.id;
}

function getSlugForCategory(name: string): string {
  return slugify(name);
}

const TYPE_OPTIONS: { value: ServiceItemType; label: string }[] = [
  { value: "ADDON", label: "Addon" },
  { value: "SERVICE", label: "Service" },
];

export default function ServiceCategoryPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const categorySlug = typeof params?.categorySlug === "string" ? params.categorySlug : "";
  const companyId = useSelector((state: RootState) => selectCurrentCompanyId(state));
  const [serviceBook, setServiceBook] = useState<ServiceBookItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [formType, setFormType] = useState<ServiceItemType>("SERVICE");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formUnit, setFormUnit] = useState<string>("0");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !slug || !categorySlug) {
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
  }, [companyId, slug, categorySlug]);

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center gap-x-4">
          <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <p className="text-neutral-800 text-p mt-2">
            Loading category...
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

  const category = (serviceBook.catories ?? []).find(
    (c) => getSlugForCategory(c.name) === categorySlug
  );

  if (!category) {
    return (
      <div>
        <p className="text-neutral-600 text-p">Category not found.</p>
        <Link
          href={`/services/${slug}`}
          className="mt-2 inline-block text-primary font-medium hover:underline"
        >
          Back to {serviceBook.name ?? "Service book"}
        </Link>
      </div>
    );
  }

  const serviceName = serviceBook.name ?? "Untitled";
  const priceInt = parseInt(formPrice, 10);
  const durationInt = parseInt(formDuration, 10);
  const unitNum = parseInt(formUnit, 10);
  const priceValid = !Number.isNaN(priceInt) && priceInt >= 0;
  const durationValid = !Number.isNaN(durationInt) && durationInt >= 0;
  const unitValid = !Number.isNaN(unitNum) && unitNum >= 0;
  const canSubmit =
    formTitle.trim() && priceValid && durationValid && unitValid && !createLoading;

  return (
    <div>
      <nav className="mb-4">
        <Link
          href={`/services/${slug}`}
          className="text-primary font-medium hover:underline text-p"
        >
          ← {serviceName}
        </Link>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-neutral-900 text-h4 font-bold">
          {category.name}
        </h1>
        <button
          type="button"
          onClick={() => setCreateServiceOpen(true)}
          className="bg-primary text-neutral-200 text-p font-bold py-3 px-4 rounded-lg flex items-center gap-x-2 cursor-pointer transition-colors hover:bg-primary/90 hover:text-neutral-50"
        >
          <div>
            <LuPlus className="size-6" />
          </div>
          Create Service
        </button>
      </div>
      <p className="text-neutral-600 text-p mt-1">
        Category under {serviceName}. Service items can be listed here.
      </p>

      <Modal
        isOpen={createServiceOpen}
        onClose={() => {
          setCreateServiceOpen(false);
          setFormType("SERVICE");
          setFormTitle("");
          setFormDescription("");
          setFormPrice("");
          setFormDuration("");
          setFormUnit("1");
          setCreateError(null);
        }}
        title="Create Service"
        primaryAction={{
          label: "Create",
          disabled: !canSubmit,
          onClick: async () => {
            if (!companyId || !category.id) return;
            const priceInt = parseInt(formPrice, 10);
            const durationInt = parseInt(formDuration, 10);
            const unitNum = parseInt(formUnit, 10);
            if (
              Number.isNaN(priceInt) || priceInt < 0 ||
              Number.isNaN(durationInt) || durationInt < 0 ||
              Number.isNaN(unitNum) || unitNum < 0
            ) return;
            setCreateError(null);
            setCreateLoading(true);
            try {
              await createServiceItem({
                companyId,
                categoryId: category.id,
                type: formType,
                title: formTitle.trim(),
                description: formDescription.trim(),
                price: priceInt,
                duration: durationInt,
                unit: unitNum,
              });
              setCreateServiceOpen(false);
              setFormType("SERVICE");
              setFormTitle("");
              setFormDescription("");
              setFormPrice("");
              setFormDuration("");
              setFormUnit("1");
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "response" in err
                  ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                  : "Failed to create service.";
              setCreateError(message ?? "Failed to create service.");
            } finally {
              setCreateLoading(false);
            }
          },
        }}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!companyId || !category.id) return;
            const priceInt = parseInt(formPrice, 10);
            const durationInt = parseInt(formDuration, 10);
            const unitNum = parseInt(formUnit, 10);
            if (
              Number.isNaN(priceInt) || priceInt < 0 ||
              Number.isNaN(durationInt) || durationInt < 0 ||
              Number.isNaN(unitNum) || unitNum < 0
            ) return;
            setCreateError(null);
            setCreateLoading(true);
            try {
              await createServiceItem({
                companyId,
                categoryId: category.id,
                type: formType,
                title: formTitle.trim(),
                description: formDescription.trim(),
                price: priceInt,
                duration: durationInt,
                unit: unitNum,
              });
              setCreateServiceOpen(false);
              setFormType("SERVICE");
              setFormTitle("");
              setFormDescription("");
              setFormPrice("");
              setFormDuration("");
              setFormUnit("1");
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "response" in err
                  ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                  : "Failed to create service.";
              setCreateError(message ?? "Failed to create service.");
            } finally {
              setCreateLoading(false);
            }
          }}
          className="space-y-4"
        >
          {createError && (
            <p className="text-sm text-red-600 bg-red-50 py-2 px-3 rounded-lg">
              {createError}
            </p>
          )}
          <div>
            <label htmlFor="service-type" className="block text-sm font-medium text-neutral-800 mb-1">
              Type
            </label>
            <select
              id="service-type"
              value={formType}
              onChange={(e) => setFormType(e.target.value as ServiceItemType)}
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="service-title" className="block text-sm font-medium text-neutral-800 mb-1">
              Title
            </label>
            <input
              id="service-title"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="service-description" className="block text-sm font-medium text-neutral-800 mb-1">
              Description
            </label>
            <textarea
              id="service-description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Description"
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="service-price" className="block text-sm font-medium text-neutral-800 mb-1">
              Price
            </label>
            <input
              id="service-price"
              type="number"
              min={0}
              step={1}
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="service-duration" className="block text-sm font-medium text-neutral-800 mb-1">
              Duration
            </label>
            <input
              id="service-duration"
              type="number"
              min={0}
              step={1}
              value={formDuration}
              onChange={(e) => setFormDuration(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="service-unit" className="block text-sm font-medium text-neutral-800 mb-1">
              Unit
            </label>
            <input
              id="service-unit"
              type="number"
              min={0}
              value={formUnit}
              onChange={(e) => setFormUnit(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
