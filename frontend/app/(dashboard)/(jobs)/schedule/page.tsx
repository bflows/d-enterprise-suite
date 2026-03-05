import { LuPlus } from "react-icons/lu";

export default function SchedulePage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-neutral-900 text-h4 font-bold">Schedule</h1>
        <button
          className="bg-primary text-neutral-200 text-p font-bold py-3 px-4 rounded-lg flex items-center gap-x-2 cursor-pointer transition-colors hover:bg-primary/90 hover:text-neutral-50"
        >
          <div>
            <LuPlus className="size-6" />
          </div>
          New Job
        </button>
      </div>


    </div>
  );
}