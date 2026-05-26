"use client";

import React, { ReactNode, useEffect } from "react";
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
  useEffect(() => {
    if (!isOpen) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevHtmlHeight = document.documentElement.style.height;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyHeight = document.body.style.height;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.height = prevBodyHeight;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden md:items-center md:justify-center md:p-4"
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
      {/* Panel — h-dvh on mobile (iOS Chrome 100vh exceeds visible viewport) */}
      <div
        className="relative z-10 flex h-dvh max-h-dvh w-full min-h-0 flex-col overflow-hidden md:h-auto md:max-h-[90dvh] md:max-w-lg md:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between bg-primary px-6 py-4 text-neutral-50 md:rounded-t-lg">
          <h2 id="modal-title" className="text-lg font-bold text-neutral-50">
            {title}
          </h2>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 -mr-2 cursor-pointer text-neutral-200 transition-colors hover:bg-neutral-50/10 hover:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Close"
            >
              <HiXMark className="size-8" />
            </button>
          )}
        </div>
        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y bg-neutral-100 px-6 py-6">
          {children}
        </div>
        {/* Footer */}
        <div
          className={`flex shrink-0 items-center gap-3 border-t border-neutral-300 bg-neutral-50 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] md:rounded-b-lg ${footerStartContent ? "justify-between" : "justify-end"}`}
        >
          {footerStartContent ?? (!hideCancelButton && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 cursor-pointer border transition-colors duration-300 ease-in-out border-neutral-300 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {cancelLabel}
            </button>
          ))}
          {primaryAction ? (
            <button
              type="button"
              onClick={(e) => { primaryAction.onClick(e); }}
              disabled={primaryAction.disabled}
              className="rounded-lg px-4 py-2 cursor-pointer transition-colors duration-300 ease-in-out bg-primary/90 text-neutral-200 hover:bg-primary hover:text-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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