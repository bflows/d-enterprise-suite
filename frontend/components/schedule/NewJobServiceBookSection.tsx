"use client";

import React, { useState, useEffect } from "react";
import {
  getServiceBooks,
  getServiceItemsByCategory,
  type ServiceBookItem,
  type ServiceBookCategoryItem,
  type ServiceItemListItem,
} from "@/lib/api/service";
import { formatUsdFromCents } from "@/lib/money";
import { HiChevronLeft, HiOutlineBookOpen, HiXMark } from "react-icons/hi2";

type ServicesPickerView = "books" | "categories" | "items";

export interface NewJobServiceBookSectionProps {
  companyId: string | null;
  isOpen: boolean;
  value: ServiceItemListItem[];
  onChange: React.Dispatch<React.SetStateAction<ServiceItemListItem[]>>;
}

export default function NewJobServiceBookSection({
  companyId,
  isOpen,
  value: selectedServiceItems,
  onChange: setSelectedServiceItems,
}: NewJobServiceBookSectionProps) {
  const [serviceBooks, setServiceBooks] = useState<ServiceBookItem[]>([]);
  const [selectedServiceBook, setSelectedServiceBook] = useState<ServiceBookItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ServiceBookCategoryItem | null>(null);
  const [categoryServiceItems, setCategoryServiceItems] = useState<ServiceItemListItem[]>([]);
  const [serviceBooksLoading, setServiceBooksLoading] = useState(false);
  const [categoryItemsLoading, setCategoryItemsLoading] = useState(false);
  const [servicesPickerView, setServicesPickerView] = useState<ServicesPickerView>("books");

  useEffect(() => {
    if (!isOpen || !companyId || servicesPickerView !== "books") return;
    queueMicrotask(() => setServiceBooksLoading(true));
    getServiceBooks(companyId)
      .then((res) => setServiceBooks(res.serviceBooks ?? []))
      .catch(() => setServiceBooks([]))
      .finally(() => setServiceBooksLoading(false));
  }, [isOpen, companyId, servicesPickerView]);

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

  return (
    <div className="mt-4">
      <div className="flex items-center gap-x-1.5">
        <div>
          <HiOutlineBookOpen className="size-6 text-neutral-800" />
        </div>
        <h2 className="text-p text-neutral-800">Services</h2>
      </div>
      {selectedServiceItems.length > 0 && (
        <ul className="mt-2 flex flex-col gap-y-1">
          {selectedServiceItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 text-p"
            >
              <span className="font-bold text-neutral-800">
                {item.title}
                {item.price != null && (
                  <span className="text-neutral-400 text-small font-normal ml-2">
                    {formatUsdFromCents(item.price)}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedServiceItems((prev) => prev.filter((s) => s.id !== item.id))
                }
                className="cursor-pointer text-secondary hover:underline"
                aria-label={`Remove ${item.title}`}
              >
                <HiXMark className="size-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2">
        {servicesPickerView === "books" && (
          <>
            {serviceBooksLoading ? (
              <div>
                <div className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                <p className="text-p font-bold mt-2 sr-only text-neutral-600">Loading...</p>
              </div>
            ) : serviceBooks.length === 0 ? (
              <p className="text-small text-neutral-400">No service books found.</p>
            ) : (
              <ul className="flex flex-col gap-y-1 max-h-40 overflow-y-auto">
                {serviceBooks.map((book) => (
                  <li key={book.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedServiceBook(book);
                        setSelectedCategory(null);
                        setServicesPickerView("categories");
                      }}
                      className="px-4 py-3 w-full text-p text-left rounded-lg border cursor-pointer bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-primary hover:text-neutral-50"
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
                className="flex items-center gap-x-2 text-neutral-400 hover:underline"
              >
                <div>
                  <HiChevronLeft className="size-4" />
                </div>
                <span className="text-small">{selectedServiceBook.name ?? "Unnamed"}</span>
              </button>
            </div>
            {(selectedServiceBook.catories?.length ?? 0) === 0 ? (
              <p className="text-small text-neutral-400">No categories in this book.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-y-1 max-h-40 overflow-y-auto">
                {selectedServiceBook.catories!.map((cat) => (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setServicesPickerView("items");
                      }}
                      className="px-4 py-3 w-full text-p text-left rounded-lg border bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-primary hover:text-neutral-50"
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
                className="flex items-center gap-x-2 text-neutral-400 hover:underline"
              >
                <div>
                  <HiChevronLeft className="size-4" />
                </div>
                <span className="text-small">{selectedCategory.name}</span>
              </button>
            </div>
            {categoryItemsLoading ? (
              <div className="mt-2">
                <div className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                <p className="text-p font-bold mt-2 sr-only text-neutral-600">Loading...</p>
              </div>
            ) : categoryServiceItems.length === 0 ? (
              <p className="text-small text-neutral-400">No service items in this category.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-y-1 max-h-48 overflow-y-auto">
                {categoryServiceItems.map((item) => {
                  const alreadyAdded = selectedServiceItems.some((s) => s.id === item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => {
                          if (alreadyAdded) return;
                          setSelectedServiceItems((prev) => [...prev, item]);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg border flex items-center justify-between ${alreadyAdded
                          ? "bg-neutral-100 text-neutral-400 border-neutral-100 cursor-not-allowed"
                          : "group bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-primary hover:text-neutral-50"
                          }`}
                      >
                        <div>
                          <span className="text-p font-bold">{item.title}</span>
                          {item.price != null && (
                            <span className="text-small ml-2 text-neutral-400 group-hover:text-neutral-200">
                              {formatUsdFromCents(item.price)}
                            </span>
                          )}
                        </div>
                        {alreadyAdded && <span className="text-small">(added)</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
