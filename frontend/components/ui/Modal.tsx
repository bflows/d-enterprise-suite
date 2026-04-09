"use client";

import React, { ReactNode } from "react";
import { HiXMark } from "react-icons/hi2";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  primaryAction?: {
    label: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
    disabled?: boolean;
  }

  cancelLabel?: string;
  closeOnBackdropClick?: boolean;
  showCloseButton?: boolean;
  /** When true, the footer Cancel button is hidden (use with header X to close). */
  hideCancelButton?: boolean;
  /** Optional content shown at the start of the footer (e.g. Edit / Delete buttons). */
  footerStartContent?: ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  primaryAction,
  cancelLabel = 'Cancel',
  closeOnBackdropClick = false,
  showCloseButton = true,
  hideCancelButton = false,
  footerStartContent
}: ModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center md:p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/80 backdrop-blur-xs"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
      className="relative z-10 flex w-full h-screen flex-col md:max-h-[90vh] md:rounded-lg md:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4 h-16 text-neutral-50 bg-primary md:rounded-t-lg">
          <h2 id="modal-title" className="text-lg font-bold text-neutral-50">
            {title}
          </h2>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 -mr-2 cursor-pointer text-neutral-200 transition-colors hover:bg-neutral-200 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Close"
            >
              <HiXMark className="size-8" />
            </button>
          )}
        </div>
        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 bg-neutral-200">
          {children}
        </div>
        {/* Sticky Footer */}
        <div className={`flex shrink-0 items-center gap-3 px-6 py-4 rounded-b-lg border-t border-neutral-400 bg-neutral-50 ${footerStartContent ? 'justify-between' : 'justify-end'}`}>
          {footerStartContent ?? (!hideCancelButton && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 cursor-pointer border border-neutral-400 bg-neutral-50 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {cancelLabel}
            </button>
          ))}
          {primaryAction ? (
            <button
              type="button"
              onClick={(e) => { primaryAction.onClick(e); }}
              disabled={primaryAction.disabled}
              className="rounded-lg bg-primary px-4 py-2 cursor-pointer text-neutral-200 transition-colors hover:bg-primary/90 hover:text-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {primaryAction.label}
            </button>
          ) : footerStartContent ? (
            <span />
          ) : null}
        </div>
      </div>
    </div>
  );
}