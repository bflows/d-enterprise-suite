"use client";

import { useEffect } from "react";

/**
 * Suppresses the browser context menu (right-click) for the whole document.
 * Note: This is easy to bypass (devtools, extensions) and can frustrate users
 * who expect the native menu; use only when product requirements call for it.
 */
export default function DisableContextMenu() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);

  return null;
}
