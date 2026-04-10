import { HiCalendar } from "react-icons/hi2";

interface ActivityCardProps {
  title: string;
  actor: string;
  time: string;
  date: string;
}

export default function ActivityCard({ title, actor, time, date }: ActivityCardProps) {
  return (
    <div className="flex gap-x-2">
      <div>
        <HiCalendar className="size-8" />
      </div>
      <div className="w-full">
        <div className="flex items-center justify-between gap-x-2">
          <p className="text-h6 font-bold text-neutral-800">{title}</p>
          <p className="text-small text-right w-16 sm:w-auto text-neutral-800">{time}</p>
        </div>
        <div className="mt-1 flex items-center justify-between gap-x-2">
          <p className="text-p text-neutral-800">{actor}</p>
          <p className="text-small text-neutral-800">{date}</p>
        </div>
      </div>
    </div>
  );
}