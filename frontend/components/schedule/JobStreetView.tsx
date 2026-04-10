"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { apiClient } from "@/lib/api/client";

export interface JobStreetViewProps {
  /** Display / alt text */
  labelAddress: string;
  street?: string;
  city?: string;
  zipCode?: string;
}

export default function JobStreetView({
  labelAddress,
  street,
  city,
  zipCode,
}: JobStreetViewProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "unavailable" | "config">(
    "loading"
  );

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const params: Record<string, string> = {};
    if (street?.trim()) params.address = street.trim();
    if (city?.trim()) params.city = city.trim();
    if (zipCode?.trim()) params.zipCode = zipCode.trim();

    void apiClient
      .get("/api/maps/street-view", {
        params,
        responseType: "blob",
      })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setImgSrc(objectUrl);
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 503) {
          setLoadState("config");
          return;
        }
        setLoadState("unavailable");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [street, city, zipCode]);

  if (loadState === "config") {
    return (
      <p className="text-small px-4 text-neutral-600">
        Street View isn&apos;t configured on the server. Add{" "}
        <code className="text-xs bg-neutral-200 px-1 rounded">GOOGLE_MAPS_API_KEY</code> to the
        backend environment and enable Geocoding and Street View Static APIs in Google Cloud.
      </p>
    );
  }

  if (loadState === "unavailable") {
    return (
      <p className="text-small px-4 text-neutral-600">
        Street View isn&apos;t available for this address (geocoding or imagery missing).
      </p>
    );
  }

  if (loadState === "loading" || !imgSrc) {
    return (
      <div
        className="mt-1 flex h-56.25 w-full max-w-2xl items-center justify-center rounded-lg border border-neutral-300 bg-neutral-100 text-small text-neutral-600"
        role="status"
        aria-live="polite"
      >
        Loading street view…
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={`Street view near ${labelAddress}`}
      className="mt-1 w-full max-w-2xl object-cover aspect-video bg-neutral-200"
    />
  );
}
