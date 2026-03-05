"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { getServiceBooks, createServiceItem, getServiceItemsByCategory, type ServiceBookItem, type ServiceItemType, type ServiceItemListItem } from "@/lib/api/service";
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
  const [serviceItems, setServiceItems] = useState<ServiceItemListItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

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

  const category = (serviceBook?.catories ?? []).find(
    (c) => getSlugForCategory(c.name) === categorySlug
  );

  useEffect(() => {
    if (!category?.id) {
      setServiceItems([]);
      return;
    }
    let cancelled = false;
    setItemsLoading(true);
    getServiceItemsByCategory(category.id)
      .then((res) => {
        if (!cancelled) setServiceItems(res.serviceItems ?? []);
      })
      .catch(() => {
        if (!cancelled) setServiceItems([]);
      })
      .finally(() => {
        if (!cancelled) setItemsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category?.id]);

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

      {itemsLoading ? (
        <div className="mt-6 flex items-center gap-x-2">
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <span className="text-p text-neutral-600">Loading items...</span>
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="mt-6 hidden overflow-x-auto rounded-lg border border-neutral-400 md:block">
            <table className="w-full min-w-160 text-left text-p bg-neutral-50">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-3 font-semibold text-neutral-800">Title</th>
                  <th className="px-4 py-3 font-semibold text-neutral-800">Type</th>
                  <th className="px-4 py-3 font-semibold text-neutral-800">Description</th>
                  <th className="px-4 py-3 font-semibold text-neutral-800">Price</th>
                  <th className="px-4 py-3 font-semibold text-neutral-800">Duration</th>
                  <th className="px-4 py-3 font-semibold text-neutral-800">Unit</th>
                </tr>
              </thead>
              <tbody>
                {serviceItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                      No service items yet. Create one above.
                    </td>
                  </tr>
                ) : (
                  serviceItems.map((item) => (
                    <tr key={item.id} className="border-b border-neutral-200 last:border-b-0">
                      <td className="px-4 py-3 text-neutral-800">{item.title}</td>
                      <td className="px-4 py-3 text-neutral-700">{item.type}</td>
                      <td className="max-w-50 truncate px-4 py-3 text-neutral-600" title={item.description}>
                        {item.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">${item.price}</td>
                      <td className="px-4 py-3 text-neutral-700">{item.duration}</td>
                      <td className="px-4 py-3 text-neutral-700">{item.unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="mt-6 flex flex-col gap-3 md:hidden">
            {serviceItems.length === 0 ? (
              <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-p text-neutral-500">
                No service items yet. Create one above.
              </p>
            ) : (
              serviceItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-neutral-900">{item.title}</h3>
                    <span className="shrink-0 rounded bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
                      {item.type}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{item.description}</p>
                  ) : null}
                  <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span><strong className="text-neutral-700">Price:</strong> {item.price}</span>
                    <span><strong className="text-neutral-700">Duration:</strong> {item.duration}</span>
                    <span><strong className="text-neutral-700">Unit:</strong> {item.unit}</span>
                  </dl>
                </div>
              ))
            )}
          </div>
        </>
      )}

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
              const res = await getServiceItemsByCategory(category.id);
              setServiceItems(res.serviceItems ?? []);
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
              const res = await getServiceItemsByCategory(category.id);
              setServiceItems(res.serviceItems ?? []);
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
