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
import { HiChevronLeft, HiOutlineBookOpen } from "react-icons/hi2";

type ServicesPickerView = "books" | "categories" | "items" | null;

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
  const [servicesPickerView, setServicesPickerView] = useState<ServicesPickerView>(null);

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
              className="flex items-center justify-between rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-p"
            >
              <span className="text-neutral-900">
                {item.title}
                {item.price != null && (
                  <span className="text-neutral-500 text-small ml-2">
                    {formatUsdFromCents(item.price)}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedServiceItems((prev) => prev.filter((s) => s.id !== item.id))
                }
                className="text-small text-red-600 hover:underline"
                aria-label={`Remove ${item.title}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {servicesPickerView == null ? (
        <button
          type="button"
          onClick={() => setServicesPickerView("books")}
          className="mt-2 rounded-lg border px-3 py-2 text-p bg-neutral-50 text-neutral-600 border-neutral-300 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Open Service Books
        </button>
      ) : (
        <div className="mt-2 rounded-lg border p-3 space-y-3 border-neutral-300 bg-neutral-50">
          {servicesPickerView === "books" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-small text-neutral-800">Select Service Book</span>
                <button
                  type="button"
                  onClick={() => setServicesPickerView(null)}
                  className="text-small text-neutral-600 hover:underline"
                >
                  Close
                </button>
              </div>
              {serviceBooksLoading ? (
                <p className="text-small text-neutral-400">Loading...</p>
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
                        className="w-full text-left px-3 py-2 rounded-lg border bg-neutral-100 border-neutral-300 text-neutral-600 hover:bg-neutral-200 hover:border-primary text-p"
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
                  className="flex items-center gap-x-2 text-neutral-600 hover:underline"
                >
                  <div>
                    <HiChevronLeft className="size-4" />
                  </div>
                  <span className="text-small">Service Books</span>
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
                {selectedServiceBook.name ?? "Unnamed"}
              </p>
              {(selectedServiceBook.catories?.length ?? 0) === 0 ? (
                <p className="text-small text-neutral-400">No categories in this book.</p>
              ) : (
                <ul className="flex flex-col gap-y-1 max-h-40 overflow-y-auto">
                  {selectedServiceBook.catories!.map((cat) => (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setServicesPickerView("items");
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg border bg-neutral-100 border-neutral-300 text-neutral-600 hover:bg-neutral-200 hover:border-primary text-p"
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
                  className="flex items-center gap-x-2 text-neutral-600 hover:underline"
                >
                  <div>
                    <HiChevronLeft className="size-4" />
                  </div>
                  <span className="text-small">Categories</span>
                </button>
                <button
                  type="button"
                  onClick={() => setServicesPickerView(null)}
                  className="text-small text-neutral-600 hover:underline"
                >
                  Close
                </button>
              </div>
              <p className="text-small text-neutral-800">{selectedCategory.name}</p>
              {categoryItemsLoading ? (
                <p className="text-small text-neutral-400">Loading...</p>
              ) : categoryServiceItems.length === 0 ? (
                <p className="text-small text-neutral-400">No service items in this category.</p>
              ) : (
                <ul className="flex flex-col gap-y-1 max-h-48 overflow-y-auto">
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
                          className={`w-full text-left px-3 py-2 rounded-lg border flex items-center justify-between ${
                            alreadyAdded
                              ? "bg-neutral-100/50 text-neutral-600/50 border-neutral-300/50 cursor-not-allowed"
                              : "group bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-primary hover:text-neutral-50"
                          }`}
                        >
                          <div className="">
                            <span className="text-p font-bold">{item.title}</span>
                            {item.price != null && (
                              <span className="text-small ml-2 group-hover:text-neutral-50">
                                {formatUsdFromCents(item.price)}
                              </span>
                            )}
                          </div>
                          {alreadyAdded && <span className="text-small ml-4">(added)</span>}
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
  );
}
