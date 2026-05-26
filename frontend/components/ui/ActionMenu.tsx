"use client";

import Link from "next/link";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { IconType } from "react-icons";

export interface ActionMenuItem {
  label: string;
  icon: IconType;
  /** Override icon sizing (react-icons `size` prop). */
  iconSize?: number;
  /** Optional Tailwind classes (e.g. "size-4 text-neutral-500"). */
  iconClassName?: string;
  /** If provided, item will render as a link. */
  href?: string;
  /** If provided, item will call this action. */
  onClick?: () => void;
  disabled?: boolean;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  trigger?: ReactNode;
  /** Optional trigger icon component (e.g. HiCircle) */
  triggerIcon?: IconType;
  /** Optional trigger icon size (react-icons `size` prop). */
  triggerIconSize?: number;
  /** Optional trigger icon className for Tailwind sizing/colors. */
  triggerIconClassName?: string;
  /** Optional aria-label for the trigger button */
  triggerLabel?: string;
  /** Align dropdown: "left" | "right" (default "right") */
  align?: "left" | "right";
}

const MENU_GAP_PX = 8;

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function ActionMenu({
  items,
  trigger,
  triggerIcon: TriggerIcon,
  triggerIconSize,
  triggerIconClassName = "size-6",
  triggerLabel = "Open menu",
  align = "right",
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    if (!triggerEl || !menuEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const menuHeight = menuEl.offsetHeight;
    const menuWidth = menuEl.offsetWidth;
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP_PX;
    const openAbove = menuHeight > 0 && spaceBelow < menuHeight && rect.top > menuHeight + MENU_GAP_PX;

    const top = openAbove
      ? rect.top - menuHeight - MENU_GAP_PX
      : rect.bottom + MENU_GAP_PX;

    menuEl.style.position = "fixed";
    menuEl.style.top = `${top}px`;
    menuEl.style.zIndex = "50";
    menuEl.style.visibility = "visible";

    if (align === "left") {
      menuEl.style.left = `${rect.left}px`;
    } else {
      menuEl.style.left = `${Math.max(MENU_GAP_PX, rect.right - menuWidth)}px`;
    }
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition, items]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleItemClick = (item: ActionMenuItem) => {
    if (item.disabled) return;
    item.onClick?.();
    setOpen(false);
  };

  const menu = open ? (
    <div
      ref={menuRef}
      role="menu"
      style={{ visibility: "hidden", position: "fixed" }}
      className="min-w-48 rounded-lg px-2 py-1.5 shadow-lg border border-neutral-300 bg-neutral-50"
    >
      <div className="flex flex-col gap-y-1">
        {items.map((item, index) =>
          item.href ? (
            item.disabled ? (
              <div
                key={index}
                role="menuitem"
                aria-disabled="true"
                className="flex w-full items-center gap-x-2 rounded-lg px-3 py-2 text-left text-neutral-6 opacity-50 cursor-not-allowed"
              >
                <div>
                  {(() => {
                    const Icon = item.icon;
                    return (
                      <Icon
                        aria-hidden
                        size={item.iconSize}
                        className={`text-neutral-600 ${item.iconClassName ?? "size-6"}`}
                      />
                    );
                  })()}
                </div>
                <p className="font-bold text-p text-neutral-600">{item.label}</p>
              </div>
            ) : (
              <Link
                key={index}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-x-3 rounded-lg px-3 py-2 text-left cursor-pointer transition-colors duration-300 ease-in-out bg-neutral-50 text-neutral-600 hover:bg-primary hover:text-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div>
                  {(() => {
                    const Icon = item.icon;
                    return (
                      <Icon
                        aria-hidden
                        size={item.iconSize}
                        className={item.iconClassName ?? "size-6"}
                      />
                    );
                  })()}
                </div>
                <p className="font-bold text-p">{item.label}</p>
              </Link>
            )
          ) : (
            <button
              key={index}
              type="button"
              role="menuitem"
              onClick={() => handleItemClick(item)}
              disabled={item.disabled || !item.onClick}
              className="flex w-full items-center gap-x-3 rounded-lg px-3 py-2 text-left cursor-pointer transition-colors duration-300 ease-in-out bg-neutral-50 text-neutral-600 hover:bg-primary hover:text-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div>
                {(() => {
                  const Icon = item.icon;
                  return (
                    <Icon
                      aria-hidden
                      size={item.iconSize}
                      className={item.iconClassName ?? "size-4"}
                    />
                  );
                })()}
              </div>
              <p className="font-bold text-p">{item.label}</p>
            </button>
          )
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-lg p-1 cursor-pointer transition-colors text-neutral-800 hover:bg-neutral-100/10 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
        aria-label={triggerLabel}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {trigger ?? (TriggerIcon ? <TriggerIcon aria-hidden size={triggerIconSize} className={triggerIconClassName} /> : null)}
      </button>
      {mounted && menu && createPortal(menu, document.body)}
    </div>
  );
}
