"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId, selectUser } from "@/features/auth/authSlice";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import Dashboard from "@/components/dashboard/Dashboard";
import NewJobModal from "@/components/schedule/NewJobModal";
import NewEmployeeModal from "@/components/employees/NewEmployeeModal";
import NewCustomerForm from "@/components/customers/NewCustomerForm";
import { listJobs } from "@/lib/api/jobs";
import type { Job } from "@/lib/calendar/types";
import { ROLE_SLUGS } from "@/types/auth";

export default function DashboardPage() {
  const user = useSelector(selectUser);
  const companyId = useSelector((state: RootState) => selectCurrentCompanyId(state));
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newJobModalOpen, setNewJobModalOpen] = useState(false);
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (searchParams.get("newJob") !== "1") return;
    queueMicrotask(() => {
      setNewJobModalOpen(true);
      router.replace("/dashboard", { scroll: false });
    });
  }, [searchParams, router]);

  useEffect(() => {
    if (searchParams.get("newCustomer") !== "1") return;
    queueMicrotask(() => {
      setNewCustomerModalOpen(true);
      router.replace("/dashboard", { scroll: false });
    });
  }, [searchParams, router]);

  useEffect(() => {
    if (!companyId) return;
    const run = () => {
      listJobs()
        .then(setJobs)
        .catch(() => { });
    };
    queueMicrotask(run);
  }, [companyId]);

  const handleJobCreate = useCallback((job: Job) => {
    setJobs((prev) => [...prev, job]);
  }, []);

  if (!user) {
    return null;
  }

  if (!user.role) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <div className="flex flex-col items-center justify-center">
          <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <p className="text-p font-bold mt-2 text-neutral-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  let content: ReactNode;
  switch (user.role) {
    case ROLE_SLUGS.TECHNICIAN:
      content = <Dashboard user={user} />;
      break;
    case ROLE_SLUGS.DISPATCHER:
    case ROLE_SLUGS.ADMIN:
      content = <Dashboard user={user} />;
      break;
    case ROLE_SLUGS.EMPLOYEE:
      content = <EmployeeDashboard user={user} />;
      break;
    default:
      content = <EmployeeDashboard user={user} />;
  }

  return (
    <>
      {content}
      <NewJobModal
        isOpen={newJobModalOpen}
        onClose={() => setNewJobModalOpen(false)}
        onSave={handleJobCreate}
        existingJobs={companyId ? jobs : []}
      />
      <NewEmployeeModal
        open={newCustomerModalOpen}
        onClose={() => setNewCustomerModalOpen(false)}
        title="New Customer"
      >
        {companyId ? (
          <NewCustomerForm
            companyId={companyId}
            onClose={() => setNewCustomerModalOpen(false)}
          />
        ) : (
          <p className="text-neutral-600 text-p">No company selected.</p>
        )}
      </NewEmployeeModal>
    </>
  );
}
