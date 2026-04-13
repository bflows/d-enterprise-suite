"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type JobNavbarActionsContextValue = {
  /** When true, the mobile Navbar "Invoice" overflow item is disabled. */
  jobInvoiceDisabled: boolean;
  setJobInvoiceDisabled: (disabled: boolean) => void;
};

const JobNavbarActionsContext = createContext<JobNavbarActionsContextValue | null>(null);

export function JobNavbarActionsProvider({ children }: { children: ReactNode }) {
  const [jobInvoiceDisabled, setJobInvoiceDisabledState] = useState(true);

  const setJobInvoiceDisabled = useCallback((disabled: boolean) => {
    setJobInvoiceDisabledState(disabled);
  }, []);

  const value = useMemo(
    () => ({ jobInvoiceDisabled, setJobInvoiceDisabled }),
    [jobInvoiceDisabled, setJobInvoiceDisabled]
  );

  return (
    <JobNavbarActionsContext.Provider value={value}>{children}</JobNavbarActionsContext.Provider>
  );
}

export function useJobNavbarActions(): JobNavbarActionsContextValue {
  const ctx = useContext(JobNavbarActionsContext);
  if (!ctx) {
    throw new Error("useJobNavbarActions must be used within JobNavbarActionsProvider");
  }
  return ctx;
}
