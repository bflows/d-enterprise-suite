import { HiCalendar } from "react-icons/hi2";

export default function ActivityCard() {
  return (
    <div className="flex gap-x-2">
      <div>
        <HiCalendar className="size-8" />
      </div>
      <div className="w-full">
        <div className="flex items-center justify-between gap-x-2">
          <p className="text-h6 font-bold text-neutral-800">Job: Scheduled 4/9</p>
          <p className="text-small text-neutral-800">10:00 AM</p>
        </div>
        <div className="mt-1 flex items-center justify-between gap-x-2">
          <p className="text-p text-neutral-800">Karson Kolle</p>
          <p className="text-small text-neutral-800">Friday 4/9/2026</p>
        </div>
      </div>
    </div>
  );
}