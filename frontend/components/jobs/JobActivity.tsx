import { HiChartBar } from "react-icons/hi2";
import ActivityCard from "./ActivityCard";

export default function JobActivity() {
  return (
    <div className="mt-4 p-4 rounded-lg border bg-neutral-50 border-neutral-300">
      <div className="flex items-center gap-x-2">
        <div>
          <HiChartBar className="size-6 shrink-0 text-neutral-900" aria-hidden />
        </div>
        <h2 className="text-h6 font-bold text-neutral-900 md:text-h5">Activity</h2>
      </div>

      <div className="mt-6 flex flex-col gap-y-4">
        <ActivityCard />
        <ActivityCard />
        <ActivityCard />
      </div>
    </div>
  );
}