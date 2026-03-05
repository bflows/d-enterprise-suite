"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { getServiceBooks, type ServiceBookItem } from "@/lib/api/service";
import { slugify } from "@/lib/utils/slug";

function getSlugForBook(book: ServiceBookItem): string {
  const name = book.name ?? "";
  return name ? slugify(name) : book.id;
}

function getSlugForCategory(name: string): string {
  return slugify(name);
}

export default function ServiceCategoryPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const categorySlug = typeof params?.categorySlug === "string" ? params.categorySlug : "";
  const companyId = useSelector((state: RootState) => selectCurrentCompanyId(state));
  const [serviceBook, setServiceBook] = useState<ServiceBookItem | null>(null);
  const [loading, setLoading] = useState(true);

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
      <h1 className="text-neutral-900 text-h4 font-bold">
        {category.name}
      </h1>
      <p className="text-neutral-600 text-p mt-1">
        Category under {serviceName}. Service items can be listed here.
      </p>
    </div>
  );
}
