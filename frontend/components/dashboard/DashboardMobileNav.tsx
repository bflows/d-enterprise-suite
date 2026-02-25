import Link from "next/link";
import { LuBookUser, LuCalendarDays, LuHouse, LuInbox } from "react-icons/lu";

export default function DashboardMobileNav() {
  return (
    <div className="bg-neutral-50 h-20 px-6 bottom-0 sticky border-t border-neutral-400 sm:hidden">
      <div className="flex items-center justify-evenly h-full">
        <Link href='/dashboard' className="h-full">
          <div className="h-full flex items-center px-4">
            <LuHouse className="text-neutral-600 size-8" />
          </div>
        </Link>
        <Link href='/schedule' className="h-full">
          <div className="h-full flex items-center px-4">
            <LuCalendarDays className="text-neutral-600 size-8" />
          </div>
        </Link>
        <Link href='/customers' className="h-full">
          <div className="h-full flex items-center px-4">
            <LuBookUser className="text-neutral-600 size-8" />
          </div>
        </Link>
        <Link href='/inbox' className="h-full">
          <div className="h-full flex items-center px-4">
            <LuInbox className="text-neutral-600 size-8" />
          </div>
        </Link>
      </div>
    </div>
  );
}