"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { Job } from "@/lib/calendar/types";
import { jobOverlapsWindow } from "@/lib/calendar/types";
import type { EmployeeListItem } from "@/lib/api/company";
import { getAvailableTechniciansForWindow } from "@/lib/api/availability";
import { HiOutlineWrench } from "react-icons/hi2";

const SEARCH_DEBOUNCE_MS = 300;

function displayEmployee(emp: EmployeeListItem) {
  const u = emp.user;
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—";
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
  /** Fired when availability vs. schedule window for the current selection changes. */
  onFitsWindowChange?: (fits: boolean) => void;
  /** Fired when the list query loading state changes (e.g. for unavailability messages). */
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
  const [allTechnicians, setAllTechnicians] = useState<EmployeeListItem[]>([]);
  const [technicianLoading, setTechnicianLoading] = useState(false);
  const [technicianDropdownOpen, setTechnicianDropdownOpen] = useState(false);

  const technicianDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTechnicians = useCallback(() => {
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
    getAvailableTechniciansForWindow({
      startDate: date,
      endDate: date,
      startTime,
      endTime: effectiveEndTime,
      ...(term && { q: term }),
    })
      .then((res) => {
        setAllTechnicians(res.employees ?? []);
      })
      .catch(() => setAllTechnicians([]))
      .finally(() => setTechnicianLoading(false));
  }, [companyId, date, startTime, effectiveEndTime, totalServiceMins, technicianSearch]);

  useEffect(() => {
    if (!isOpen) return;
    if (technicianDebounceRef.current) {
      clearTimeout(technicianDebounceRef.current);
    }
    technicianDebounceRef.current = setTimeout(() => {
      technicianDebounceRef.current = null;
      loadTechnicians();
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (technicianDebounceRef.current) {
        clearTimeout(technicianDebounceRef.current);
      }
    };
  }, [isOpen, date, startTime, totalServiceMins, technicianSearch, loadTechnicians]);

  const availableTechnicians = React.useMemo(() => {
    if (!date || !startTime || !effectiveEndTime || totalServiceMins <= 0) {
      return allTechnicians;
    }
    return allTechnicians.filter((emp) => {
      const techId = emp.id;
      const overlaps = jobsForOverlap.some((job) =>
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
    const inWeeklyAvailability = allTechnicians.some((e) => e.id === selectedTechnician.id);
    if (!inWeeklyAvailability) return false;
    const overlapsOtherJob = jobsForOverlap.some((job) =>
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
        <div className="mt-2 flex items-center justify-between rounded-lg border px-4 py-3 border-neutral-200 bg-neutral-50">
          <span className="text-p text-neutral-800">
            {displayEmployee(selectedTechnician)}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setTechnicianSearch("");
            }}
            className="text-small text-primary hover:underline"
          >
            Clear
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={technicianSearch}
            onChange={(e) => {
              setTechnicianSearch(e.target.value);
              setTechnicianDropdownOpen(true);
            }}
            onFocus={() => setTechnicianDropdownOpen(true)}
            placeholder="Search name or phone"
            className="mt-2 w-full rounded-lg border px-4 py-3 text-p bg-neutral-50 border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
          />
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
                        ? "No technicians have availability for this date/time, try a different search."
                        : "Select date, time, and at least one service to see available technicians."
                      : "No technicians available for this date/time (already booked)."}
                  </p>
                ) : (
                  <div className="px-4 py-3 flex flex-col gap-y-1">
                    {availableTechnicians.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className="w-full text-left px-4 py-3 text-p rounded-lg text-neutral-600 hover:text-neutral-50 hover:bg-primary focus:bg-neutral-100 focus:outline-none"
                        onClick={() => {
                          onChange(emp);
                          setTechnicianSearch("");
                          setTechnicianDropdownOpen(false);
                        }}
                      >
                        {displayEmployee(emp)}
                      </button>
                    ))}
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
