"use client";

import { useCallback, useEffect, useState } from "react";
import { HiDocumentText } from "react-icons/hi2";
import { mapApiJobToJob, updateJob } from "@/lib/api/jobs";
import type { Job } from "@/lib/calendar/types";

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return "Could not save notes.";
}

export interface JobNotesProps {
  jobId: string;
  notes?: string;
  onSaved?: (job: Job) => void;
}

export default function JobNotes({ jobId, notes, onSaved }: JobNotesProps) {
  const savedText = notes ?? "";
  const [text, setText] = useState(savedText);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setText(savedText);
  }, [jobId, savedText]);

  const isDirty = text !== savedText;

  const handleSave = useCallback(async () => {
    if (!isDirty) return;
    setSaveError(null);
    setSaveLoading(true);
    try {
      const trimmed = text.trim();
      const res = await updateJob(jobId, {
        notes: trimmed === "" ? null : trimmed,
      });
      const mapped = mapApiJobToJob(res.job);
      onSaved?.(mapped);
    } catch (err: unknown) {
      setSaveError(errorMessage(err));
    } finally {
      setSaveLoading(false);
    }
  }, [isDirty, jobId, onSaved, text]);

  return (
    <div className="mt-4 p-4 rounded-lg border bg-neutral-50 border-neutral-300">
      <div className="flex items-center gap-x-2">
        <div>
          <HiDocumentText className="size-6 text-neutral-900" />
        </div>
        <h2 className="text-h6 font-bold text-neutral-900">Notes</h2>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="mt-4 py-1 px-3 w-full rounded-lg resize-none text-p bg-neutral-200 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
        disabled={saveLoading}
        aria-label="Job notes"
      />
      {saveError && (
        <p className="mt-2 text-sm text-red-600 bg-red-50 py-2 px-3 rounded-lg" role="alert">
          {saveError}
        </p>
      )}
      {isDirty && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saveLoading}
            className="text-p py-2 px-3 rounded-lg cursor-pointer transition-colors duration-300 ease-in-out bg-primary/90 text-neutral-200 hover:bg-primary hover:text-neutral-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saveLoading ? "Saving…" : "Save Notes"}
          </button>
        </div>
      )}
    </div>
  );
}
