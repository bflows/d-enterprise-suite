"use client";

import { useRef, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ActionMenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  trigger?: ReactNode;
  /** Optional aria-label for the trigger button */
  triggerLabel?: string;
  /** Align dropdown: "left" | "right" (default "right") */
  align?: "left" | "right";
}

export default function ActionMenu({
  items,
  trigger,
  triggerLabel = "Open menu",
  align = "right",
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open || typeof document === "undefined") return;
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const minWidth = 160; // min-w-40
    const left = align === "right" ? rect.right - minWidth : rect.left;
    setDropdownPosition({
      top: rect.bottom + 4,
      left,
    });
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const target = e.target as Node;
        const portal = document.getElementById("action-menu-portal");
        if (portal?.contains(target)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleItemClick = (item: ActionMenuItem) => {
    if (item.disabled) return;
    item.onClick();
    setOpen(false);
  };

  const dropdownContent = open && dropdownPosition && typeof document !== "undefined" && createPortal(
    <div
      id="action-menu-portal"
      role="menu"
      className="fixed flex flex-col gap-y-1 z-100 min-w-40 rounded-lg border border-neutral-400 bg-neutral-50 px-2 py-2 shadow-lg"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          type="button"
          role="menuitem"
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
          className="flex w-full items-center gap-x-3 px-2 py-2 text-left rounded-lg cursor-pointer group text-neutral-600 transition-colors hover:bg-primary hover:text-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="size-6 flex items-center justify-center transition-colors group-hover:text-neutral-50">
            {item.icon}
          </div>
          <span className="font-bold text-p">
            {item.label}
          </span>
        </button>
      ))}
    </div>,
    document.body
  );

  return (
    <div className="relative inline-flex" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-lg p-1 text-neutral-600 cursor-pointer transition-colors hover:bg-neutral-200 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
        aria-label={triggerLabel}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {trigger}
      </button>
      {dropdownContent}
    </div>
  );
}
