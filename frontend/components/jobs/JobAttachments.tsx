"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { LuCamera, LuUpload } from "react-icons/lu";
import {
  listJobPhotos,
  uploadJobPhoto,
  type JobPhoto,
  type JobPhotoSource,
} from "@/lib/api/jobs";
import { HiLink } from "react-icons/hi2";
import Link from "next/link";

interface JobAttachmentsProps {
  jobId: string;
}

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

export default function JobAttachments({ jobId }: JobAttachmentsProps) {
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const uploadSource = useMemo<JobPhotoSource>(
    () => (isMobileDevice() ? "camera_roll" : "library"),
    []
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listJobPhotos(jobId)
      .then((items) => {
        if (!cancelled) setPhotos(items);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load attachments.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const handleUploadFiles = async (files: FileList | null, source: JobPhotoSource) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const uploaded = await Promise.all(
        Array.from(files).map((file) => uploadJobPhoto(jobId, file, source))
      );
      setPhotos((prev) => [...uploaded, ...prev]);
    } catch {
      setError("Could not upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-lg border border-neutral-300 bg-neutral-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-neutral-900">
          <HiLink className="size-6 shrink-0 text-neutral-900" aria-hidden />
          <h2 className="text-h6 font-bold md:text-h5">Attachments</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg cursor-pointer bg-primary px-3 py-2 text-neutral-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LuUpload className="size-4" />
            Upload
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg cursor-pointer border border-neutral-400 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LuCamera className="size-4" />
            Take Photo
          </button>
        </div>
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleUploadFiles(e.target.files, uploadSource);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleUploadFiles(e.target.files, "live_camera");
          e.target.value = "";
        }}
      />

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {uploading && <p className="mt-3 text-sm text-neutral-600">Uploading image…</p>}

      {loading ? (
        <p className="mt-3 text-sm text-neutral-600">Loading attachments…</p>
      ) : photos.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-600">No attachments yet.</p>
      ) : (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-4">
          {photos.map((photo) => (
            <Link
              key={photo.id}
              href={photo.secureUrl || photo.url}
              target="_blank"
              rel="noreferrer"
              className="group w-40 shrink-0 overflow-hidden rounded-lg border border-neutral-300 bg-white sm:w-auto sm:shrink"
            >
              <div className="relative h-32 w-full">
                <Image
                  src={photo.secureUrl || photo.url}
                  alt="Job attachment"
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition group-hover:scale-[1.02]"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}