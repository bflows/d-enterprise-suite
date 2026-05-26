"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { Job } from "@/lib/calendar/types";
import { jobBlocksTechnicianOverlap, jobOverlapsWindow } from "@/lib/calendar/types";
import type { EmployeeListItem } from "@/lib/api/company";
import { searchEmployees } from "@/lib/api/company";
import {
  listAvailabilityByEmployee,
  type AvailableTechnicianListItem,
} from "@/lib/api/availability";
import {
  jobWindowCoversFromStrings,
  technicianCoversWindow,
} from "@/lib/availability/schedulingWindow";
import { isSchedulableRoleSlug } from "@/types/auth";
import { HiOutlineWrench, HiXMark } from "react-icons/hi2";
import { HiSearch } from "react-icons/hi";

const SEARCH_DEBOUNCE_MS = 300;

type SchedulableEmployee = EmployeeListItem & Pick<AvailableTechnicianListItem, "coversWindow">;

function displayEmployee(emp: EmployeeListItem) {
  const u = emp.user;
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—";
}

function employeeCoversWindow(emp: SchedulableEmployee): boolean {
  return emp.coversWindow === true;
}

export interface TechnicianSearchProps {
  isOpen: boolean;
  companyId: string | null;
  date: string;
  startTime: string;
  effectiveEndTime: string;
  totalServiceMins: number;
  jobsForOverlap: Job[];
  value: EmployeeListItem | null;
  onChange: (technician: EmployeeListItem | null) => void;
  onFitsWindowChange?: (fits: boolean) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export default function TechnicianSearch({
  isOpen,
  companyId,
  date,
  startTime,
  effectiveEndTime,
  totalServiceMins,
  jobsForOverlap,
  value: selectedTechnician,
  onChange,
  onFitsWindowChange,
  onLoadingChange,
}: TechnicianSearchProps) {
  const [technicianSearch, setTechnicianSearch] = useState("");
  const [allTechnicians, setAllTechnicians] = useState<SchedulableEmployee[]>([]);
  const [technicianLoading, setTechnicianLoading] = useState(false);
  const [technicianDropdownOpen, setTechnicianDropdownOpen] = useState(false);

  const technicianDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTechnicians = useCallback(async () => {
    if (!companyId) {
      setAllTechnicians([]);
      return;
    }
    const hasWindow = date && startTime && effectiveEndTime && totalServiceMins > 0;
    if (!hasWindow) {
      setAllTechnicians([]);
      setTechnicianLoading(false);
      return;
    }

    setTechnicianLoading(true);
    const term = technicianSearch.trim();
    const jobWindow = jobWindowCoversFromStrings(date, startTime, effectiveEndTime);

    try {
      const searchRes = await searchEmployees(companyId, term);

      const schedulable = (searchRes.employees ?? []).filter((e) =>
        isSchedulableRoleSlug(e.roleSlug)
      );

      const merged = await Promise.all(
        schedulable.map(async (emp): Promise<SchedulableEmployee> => {
          if (!jobWindow) {
            return { ...emp, coversWindow: false };
          }

          const { availabilities } = await listAvailabilityByEmployee(emp.id);
          const slots = availabilities.map((a) => ({
            dayOfWeek: a.dayOfWeek,
            startTimeMinutes: a.startTimeMinutes,
            endTimeMinutes: a.endTimeMinutes,
            effectiveFrom: a.effectiveFrom,
            effectiveTo: a.effectiveTo,
          }));
          const covers = technicianCoversWindow(
            slots,
            jobWindow.jobStartMinutes,
            jobWindow.jobEndMinutes,
            jobWindow.dateStrings
          );
          return { ...emp, coversWindow: covers };
        })
      );

      merged.sort((a, b) => {
        const aCovers = employeeCoversWindow(a) ? 0 : 1;
        const bCovers = employeeCoversWindow(b) ? 0 : 1;
        if (aCovers !== bCovers) return aCovers - bCovers;
        return displayEmployee(a).localeCompare(displayEmployee(b));
      });

      setAllTechnicians(merged);
    } catch {
      setAllTechnicians([]);
    } finally {
      setTechnicianLoading(false);
    }
  }, [companyId, date, startTime, effectiveEndTime, totalServiceMins, technicianSearch]);

  useEffect(() => {
    if (!isOpen) return;
    if (technicianDebounceRef.current) {
      clearTimeout(technicianDebounceRef.current);
    }
    technicianDebounceRef.current = setTimeout(() => {
      technicianDebounceRef.current = null;
      void loadTechnicians();
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (technicianDebounceRef.current) {
        clearTimeout(technicianDebounceRef.current);
      }
    };
  }, [isOpen, date, startTime, effectiveEndTime, totalServiceMins, technicianSearch, loadTechnicians]);

  const availableTechnicians = React.useMemo(() => {
    if (!date || !startTime || !effectiveEndTime || totalServiceMins <= 0) {
      return allTechnicians;
    }
    return allTechnicians.filter((emp) => {
      const techId = emp.id;
      const overlaps = jobsForOverlap.some(
        (job) =>
          jobBlocksTechnicianOverlap(job) &&
          jobOverlapsWindow(
            job,
            date,
            startTime,
            date,
            effectiveEndTime,
            techId
          )
      );
      return !overlaps;
    });
  }, [
    allTechnicians,
    jobsForOverlap,
    date,
    startTime,
    effectiveEndTime,
    totalServiceMins,
  ]);

  const selectedTechnicianFitsWindow = React.useMemo(() => {
    if (!selectedTechnician) return true;
    if (!date || !startTime || effectiveEndTime === "" || totalServiceMins <= 0) {
      return true;
    }
    if (technicianLoading) return true;
    const match = allTechnicians.find((e) => e.id === selectedTechnician.id);
    if (!match || !employeeCoversWindow(match)) return false;
    const overlapsOtherJob = jobsForOverlap.some(
      (job) =>
        jobBlocksTechnicianOverlap(job) &&
        jobOverlapsWindow(
          job,
          date,
          startTime,
          date,
          effectiveEndTime,
          selectedTechnician.id
        )
    );
    return !overlapsOtherJob;
  }, [
    selectedTechnician,
    date,
    startTime,
    effectiveEndTime,
    totalServiceMins,
    technicianLoading,
    allTechnicians,
    jobsForOverlap,
  ]);

  useEffect(() => {
    onFitsWindowChange?.(selectedTechnicianFitsWindow);
  }, [selectedTechnicianFitsWindow, onFitsWindowChange]);

  useEffect(() => {
    onLoadingChange?.(technicianLoading);
  }, [technicianLoading, onLoadingChange]);

  return (
    <div className="relative mt-4">
      <div className="flex items-center gap-x-1.5">
        <div>
          <HiOutlineWrench className="size-6 text-neutral-800" />
        </div>
        <h2 className="text-p text-neutral-800">Technician</h2>
      </div>
      {selectedTechnician ? (
        <div className="mt-2 flex items-center justify-between rounded-lg border px-4 py-3 border-neutral-300 bg-neutral-50">
          <span className="text-p text-neutral-800">
            {displayEmployee(selectedTechnician)}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setTechnicianSearch("");
            }}
            className="text-secondary"
          >
            <HiXMark className="size-5" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center cursor-default">
              <HiSearch className="size-4 text-neutral-400" />
            </div>
            <input
              type="text"
              value={technicianSearch}
              onChange={(e) => {
                setTechnicianSearch(e.target.value);
                setTechnicianDropdownOpen(true);
              }}
              onFocus={() => setTechnicianDropdownOpen(true)}
              placeholder="Search name or phone"
              className="mt-2 block w-full rounded-lg border pl-10 pr-4 py-3 text-p bg-neutral-50 border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {technicianDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden="true"
                onClick={() => setTechnicianDropdownOpen(false)}
              />
              <div className="absolute z-50 mt-2 w-full rounded-lg border border-neutral-200 bg-neutral-50 shadow-lg max-h-48 overflow-y-auto">
                {technicianLoading ? (
                  <p className="px-4 py-3 text-small text-neutral-400">Searching...</p>
                ) : availableTechnicians.length === 0 ? (
                  <p className="px-4 py-3 text-small text-neutral-400">
                    {allTechnicians.length === 0
                      ? date && startTime && totalServiceMins > 0
                        ? "No technicians or admins match this search."
                        : "Select date, time, and at least one service to see available technicians."
                      : "No technicians or admins available for this time (already booked)."}
                  </p>
                ) : (
                  <div className="px-4 py-3 flex flex-col gap-y-1">
                    {availableTechnicians.map((emp) => {
                      const fitsWindow = employeeCoversWindow(emp);
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          disabled={!fitsWindow}
                          className={`flex w-full items-center justify-between gap-3 text-left px-4 py-3 text-p rounded-lg focus:outline-none ${
                            fitsWindow
                              ? "text-neutral-600 hover:text-neutral-50 hover:bg-primary focus:bg-neutral-100 cursor-pointer"
                              : "cursor-not-allowed text-neutral-400 bg-neutral-100"
                          }`}
                          onClick={() => {
                            if (!fitsWindow) return;
                            onChange(emp);
                            setTechnicianSearch("");
                            setTechnicianDropdownOpen(false);
                          }}
                        >
                          <span className="min-w-0 truncate">
                            {displayEmployee(emp)}
                            {!fitsWindow && (
                              <span className="block text-xs font-normal text-neutral-500">
                                Outside weekly availability for this time
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-small tabular-nums">
                            {emp.user.phoneNumber || "—"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
