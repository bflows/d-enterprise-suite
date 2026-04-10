import { Job } from "@/lib/calendar/types";
import { HiArrowRight, HiCalendar } from "react-icons/hi2";

export interface JobScheduleProps {
  job: Job;
}

const scheduleDateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function getTechnicianInitials(name: string | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstInitial = parts[0]?.charAt(0).toUpperCase() ?? "";
  const lastInitial = (parts.length > 1 ? parts[parts.length - 1] : parts[0])
    ?.charAt(0)
    .toUpperCase() ?? "";
  return `${firstInitial}${lastInitial}`;
}

function formatTimeParts(time: string | undefined): { time: string; period: "AM" | "PM" } {
  if (!time?.trim()) {
    return { time: "--:--", period: "AM" };
  }
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) {
    return { time, period: "AM" };
  }
  const hours24 = Number(match[1]);
  const minutes = match[2];
  const period: "AM" | "PM" = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return { time: `${hours12}:${minutes}`, period };
}

export default function JobSchedule({ job }: JobScheduleProps) {
  const technicianInitials = getTechnicianInitials(job.technicianName);
  const formattedDate = scheduleDateFmt.format(new Date(`${job.date}T12:00:00`));
  const endDateKey = job.endDate ?? job.date;
  const scheduleDateLabel =
    endDateKey !== job.date
      ? `${formattedDate} - ${scheduleDateFmt.format(new Date(`${endDateKey}T12:00:00`))}`
      : formattedDate;
  const startTime = formatTimeParts(job.startTime);
  const endTime = formatTimeParts(job.endTime);

  return (
    <div className="mt-4 p-4 rounded-lg border bg-neutral-50 border-neutral-300">
      <div className="flex items-center gap-x-2">
        <div>
          <HiCalendar className="size-6 text-neutral-900" />
        </div>
        <h2 className="text-h6 font-bold text-neutral-900">Schedule</h2>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary text-small font-bold"
          aria-label={`Technician initials ${technicianInitials}`}
        >
          {technicianInitials}
        </div>
        <p className="text-p text-neutral-800">{job.technicianName}</p>
      </div>

      <p className="mt-4 text-p text-neutral-800">{scheduleDateLabel}</p>
      <div className="mt-2 flex items-center justify-between bg-primary py-4 px-6 rounded-lg">
        <div className="flex flex-col items-end">
          <p className="text-h6 font-bold text-neutral-100">{startTime.time}</p>
          <p className="text-small text-neutral-200">{startTime.period}</p>
        </div>
        <div>
          <HiArrowRight className="size-8 text-neutral-100" />
        </div>
        <div className="flex flex-col items-end">
          <p className="text-h6 font-bold text-neutral-100">{endTime.time}</p>
          <p className="text-small text-neutral-200">{endTime.period}</p>
        </div>
      </div>
    </div>
  );
}