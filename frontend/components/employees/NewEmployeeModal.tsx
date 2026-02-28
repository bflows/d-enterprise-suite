"use client";

import { LuX } from "react-icons/lu";

interface NewEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function NewEmployeeModal({
  open,
  onClose,
  children,
  title = "New Employee",
}: NewEmployeeModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="new-employee-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/80 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg border border-neutral-400 bg-neutral-200 shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-400 bg-neutral-50 px-6 py-4">
          <h2
            id="new-employee-modal-title"
            className="text-h6 font-bold text-neutral-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-600 transition-colors cursor-pointer hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Close"
          >
            <LuX className="size-6" />
          </button>
        </div>
        <div className="px-6 mt-4 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
