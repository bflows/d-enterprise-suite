"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { getServiceBooks, createServiceItem, getServiceItemsByCategory, updateServiceItem, deleteServiceItem, type ServiceBookItem, type ServiceItemType, type ServiceItemListItem } from "@/lib/api/service";
import { formatUsdFromCents, wholeDollarsToCents } from "@/lib/money";
import { slugify } from "@/lib/utils/slug";
import { LuPlus, LuEllipsisVertical, LuExternalLink, LuPencil, LuTrash2, LuMoveLeft } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import ActionMenu from "@/components/ui/ActionMenu";

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

function formatDuration(duration: number): string {
  if (!Number.isFinite(duration) || duration < 0) return "0m";

  const totalMinutes = Math.floor(duration);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}hr`;
  return `${hours}hr ${minutes}m`;
}

export default function ServiceCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const [viewItemOpen, setViewItemOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<ServiceItemListItem | null>(null);

  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItemListItem | null>(null);
  const [editType, setEditType] = useState<ServiceItemType>("SERVICE");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editUnit, setEditUnit] = useState("0");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteItemOpen, setDeleteItemOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ServiceItemListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  useEffect(() => {
    if (searchParams.get("newService") !== "1") return;
    queueMicrotask(() => {
      setFormType("SERVICE");
      setFormTitle("");
      setFormDescription("");
      setFormPrice("");
      setFormDuration("");
      setFormUnit("0");
      setCreateError(null);
      setCreateServiceOpen(true);
      router.replace(`/services/${slug}/${categorySlug}`, { scroll: false });
    });
  }, [searchParams, router, slug, categorySlug]);

  const refetchServiceItems = () => {
    if (!category?.id) return;
    getServiceItemsByCategory(category.id).then((res) => setServiceItems(res.serviceItems ?? [])).catch(() => setServiceItems([]));
  };

  function getServiceItemMenuItems(item: ServiceItemListItem) {
    return [
      {
        label: "View",
        icon: LuExternalLink,
        onClick: () => {
          setViewingItem(item);
          setViewItemOpen(true);
        },
      },
      {
        label: "Edit",
        icon: LuPencil,
        onClick: () => {
          setEditingItem(item);
          setEditType(item.type);
          setEditTitle(item.title);
          setEditDescription(item.description ?? "");
          setEditPrice(String(Math.round(item.price / 100)));
          setEditDuration(String(item.duration));
          setEditUnit(String(item.unit));
          setEditError(null);
          setEditItemOpen(true);
        },
      },
      {
        label: "Delete",
        icon: LuTrash2,
        onClick: () => {
          setItemToDelete(item);
          setDeleteError(null);
          setDeleteItemOpen(true);
        },
      },
    ];
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
        <p className="text-p font-bold mt-2 text-neutral-600">Loading services...</p>
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

  const editPriceInt = parseInt(editPrice, 10);
  const editDurationInt = parseInt(editDuration, 10);
  const editUnitNum = parseInt(editUnit, 10);
  const editPriceValid = !Number.isNaN(editPriceInt) && editPriceInt >= 0;
  const editDurationValid = !Number.isNaN(editDurationInt) && editDurationInt >= 0;
  const editUnitValid = !Number.isNaN(editUnitNum) && editUnitNum >= 0;
  const canSaveEdit =
    editTitle.trim() && editPriceValid && editDurationValid && editUnitValid && !editLoading;

  return (
    <div>
      <nav className="hidden sm:block sm:mb-4">
        <Link
          href={`/services/${slug}`}
          className="text-primary text-p flex items-center gap-x-3 w-fit py-3 px-4 rounded-lg transition-colors hover:text-neutral-50 hover:bg-primary"
        >
          <div>
            <LuMoveLeft className="size-6" />
          </div>
          {serviceName}
        </Link>
      </nav>
      <div className="flex items-end justify-between">
        <h1 className="text-neutral-900 text-h4 font-bold">
          {category.name}
        </h1>
        <button
          type="button"
          onClick={() => setCreateServiceOpen(true)}
          className="bg-primary text-neutral-200 hidden text-p font-bold py-3 px-4 rounded-lg sm:flex items-center gap-x-2 cursor-pointer transition-colors hover:bg-primary/90 hover:text-neutral-50"
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
            <table className="w-full min-w-160 max-h-[80vh] text-left text-p bg-neutral-50">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-3 font-semibold text-neutral-800">Title</th>
                  <th className="px-4 py-3 font-semibold text-neutral-800">Type</th>
                  <th className="px-4 py-3 font-semibold text-neutral-800">Description</th>
                  <th className="px-4 py-3 font-semibold text-neutral-800">Price</th>
                  <th className="px-4 py-3 font-semibold text-neutral-800">Duration</th>
                  <th className="px-4 py-3 font-semibold text-neutral-800">Unit</th>
                  <th className="px-4 py-3 font-semibold text-neutral-800 w-12">Actions</th>
                </tr>
              </thead>
              <tbody>
                {serviceItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                      No service items yet. Create one to get started.
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
                      <td className="px-4 py-3 text-neutral-700">{formatUsdFromCents(item.price)}</td>
                      <td className="px-4 py-3 text-neutral-700">{formatDuration(item.duration)}</td>
                      <td className="px-4 py-3 text-neutral-700">{item.unit}</td>
                      <td className="px-4 py-3">
                        <ActionMenu
                          items={getServiceItemMenuItems(item)}
                          trigger={<LuEllipsisVertical className="size-6" />}
                          triggerLabel={`Actions for ${item.title}`}
                          align="right"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: PriceBook-style card list */}
          <ul className="mt-6 grid gap-3 md:hidden">
            {serviceItems.length === 0 ? (
              <li>
                <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-p text-neutral-500">
                  No service items yet. Create one to get started.
                </p>
              </li>
            ) : (
              serviceItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-x-2 rounded-lg p-4 border border-neutral-300 bg-neutral-50 transition-colors hover:border-primary"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="text-h6 font-bold text-neutral-900">
                      {item.title} ({formatDuration(item.duration)})
                    </h2>
                    <p className="text-p text-neutral-800 mt-2">
                      {item.description}
                    </p>
                    <p className="text-p text-neutral-800 mt-2">
                      {formatUsdFromCents(item.price)}
                    </p>
                    <p className="mt-2 py-1 px-3 rounded-full text-sm w-fit bg-neutral-200 text-neutral-600">
                      {item.type}
                    </p>
                  </div>
                  <ActionMenu
                    items={getServiceItemMenuItems(item)}
                    trigger={<LuEllipsisVertical className="size-6" />}
                    triggerLabel={`Actions for ${item.title}`}
                    align="right"
                  />
                </li>
              ))
            )}
          </ul>
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
        title="New Service"
        primaryAction={{
          label: "Create Service",
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
                price: wholeDollarsToCents(priceInt),
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
                price: wholeDollarsToCents(priceInt),
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
              rows={3}
              placeholder="Description"
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="service-price" className="block text-sm font-medium text-neutral-800 mb-1">
              Price
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
                $
              </span>
              <input
                id="service-price"
                type="number"
                min={0}
                step={1}
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-neutral-400 bg-neutral-50 py-2 pl-7 pr-3 text-neutral-800 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label htmlFor="service-duration" className="block text-sm font-medium text-neutral-800 mb-1">
              Duration (minutes)
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

      {/* View service item */}
      <Modal
        isOpen={viewItemOpen}
        onClose={() => {
          setViewItemOpen(false);
          setViewingItem(null);
        }}
        title={viewingItem ? viewingItem.title : "Service Item"}
      >
        {viewingItem && (
          <div className="space-y-3 text-p text-neutral-700">
            <p><strong className="text-neutral-800">Type:</strong> {viewingItem.type}</p>
            {viewingItem.description ? (
              <p><strong className="text-neutral-800">Description:</strong><br />{viewingItem.description}</p>
            ) : null}
            <p><strong className="text-neutral-800">Price:</strong> {formatUsdFromCents(viewingItem.price)}</p>
            <p><strong className="text-neutral-800">Duration:</strong> {formatDuration(viewingItem.duration)}</p>
            <p><strong className="text-neutral-800">Unit:</strong> {viewingItem.unit}</p>
          </div>
        )}
      </Modal>

      {/* Edit service item */}
      <Modal
        isOpen={editItemOpen}
        onClose={() => {
          if (!editLoading) {
            setEditItemOpen(false);
            setEditingItem(null);
            setEditError(null);
          }
        }}
        title="Update Service"
        primaryAction={{
          label: editLoading ? "Saving..." : "Save Service",
          disabled: !canSaveEdit,
          onClick: async () => {
            if (!editingItem || !category?.id) return;
            const priceInt = parseInt(editPrice, 10);
            const durationInt = parseInt(editDuration, 10);
            const unitNum = parseInt(editUnit, 10);
            if (
              Number.isNaN(priceInt) || priceInt < 0 ||
              Number.isNaN(durationInt) || durationInt < 0 ||
              Number.isNaN(unitNum) || unitNum < 0
            ) return;
            setEditError(null);
            setEditLoading(true);
            try {
              await updateServiceItem({
                id: editingItem.id,
                type: editType,
                title: editTitle.trim(),
                description: editDescription.trim(),
                price: wholeDollarsToCents(priceInt),
                duration: durationInt,
                unit: unitNum,
              });
              refetchServiceItems();
              setEditItemOpen(false);
              setEditingItem(null);
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "response" in err
                  ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                  : "Failed to update service item.";
              setEditError(message ?? "Failed to update service item.");
            } finally {
              setEditLoading(false);
            }
          },
        }}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editingItem || !category?.id) return;
            const priceInt = parseInt(editPrice, 10);
            const durationInt = parseInt(editDuration, 10);
            const unitNum = parseInt(editUnit, 10);
            if (
              Number.isNaN(priceInt) || priceInt < 0 ||
              Number.isNaN(durationInt) || durationInt < 0 ||
              Number.isNaN(unitNum) || unitNum < 0
            ) return;
            setEditError(null);
            setEditLoading(true);
            try {
              await updateServiceItem({
                id: editingItem.id,
                type: editType,
                title: editTitle.trim(),
                description: editDescription.trim(),
                price: wholeDollarsToCents(priceInt),
                duration: durationInt,
                unit: unitNum,
              });
              refetchServiceItems();
              setEditItemOpen(false);
              setEditingItem(null);
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "response" in err
                  ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                  : "Failed to update service item.";
              setEditError(message ?? "Failed to update service item.");
            } finally {
              setEditLoading(false);
            }
          }}
          className="space-y-4"
        >
          {editError && (
            <p className="text-sm text-red-600 bg-red-50 py-2 px-3 rounded-lg">{editError}</p>
          )}
          <div>
            <label htmlFor="edit-service-type" className="block text-sm font-medium text-neutral-800 mb-1">Type</label>
            <select
              id="edit-service-type"
              value={editType}
              onChange={(e) => setEditType(e.target.value as ServiceItemType)}
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-service-title" className="block text-sm font-medium text-neutral-800 mb-1">Title</label>
            <input
              id="edit-service-title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="edit-service-description" className="block text-sm font-medium text-neutral-800 mb-1">Description</label>
            <textarea
              id="edit-service-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              placeholder="Description"
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="edit-service-price" className="block text-sm font-medium text-neutral-800 mb-1">Price</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
                $
              </span>
              <input
                id="edit-service-price"
                type="number"
                min={0}
                step={1}
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-full rounded-lg border border-neutral-400 bg-neutral-50 py-2 pl-7 pr-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label htmlFor="edit-service-duration" className="block text-sm font-medium text-neutral-800 mb-1">Duration (minutes)</label>
            <input
              id="edit-service-duration"
              type="number"
              min={0}
              step={1}
              value={editDuration}
              onChange={(e) => setEditDuration(e.target.value)}
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="edit-service-unit" className="block text-sm font-medium text-neutral-800 mb-1">Unit</label>
            <input
              id="edit-service-unit"
              type="number"
              min={0}
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </form>
      </Modal>

      {/* Delete service item */}
      <Modal
        isOpen={deleteItemOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteItemOpen(false);
            setItemToDelete(null);
            setDeleteError(null);
          }
        }}
        closeOnBackdropClick={true}
        title="Remove Service"
        primaryAction={{
          label: deleteLoading ? "Deleting..." : "Delete Service",
          disabled: deleteLoading,
          onClick: async () => {
            if (!itemToDelete) return;
            setDeleteError(null);
            setDeleteLoading(true);
            try {
              await deleteServiceItem(itemToDelete.id);
              refetchServiceItems();
              setDeleteItemOpen(false);
              setItemToDelete(null);
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "response" in err
                  ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                  : "Failed to delete service item.";
              setDeleteError(message ?? "Failed to delete service item.");
            } finally {
              setDeleteLoading(false);
            }
          },
        }}
      >
        <div className="space-y-4">
          {deleteError && (
            <p className="text-sm text-red-600 bg-red-50 py-2 px-3 rounded-lg" role="alert">{deleteError}</p>
          )}
          <p className="text-neutral-700 text-p">
            {itemToDelete ? (
              <>
                Are you sure you want to delete <strong>{itemToDelete.title}</strong>? This cannot be undone.
              </>
            ) : (
              "No item selected."
            )}
          </p>
        </div>
      </Modal>
    </div>
  );
}
