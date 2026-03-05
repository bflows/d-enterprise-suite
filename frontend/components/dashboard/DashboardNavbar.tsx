import { LuEllipsisVertical, LuPanelLeftOpen } from "react-icons/lu";

export default function DashboardNavbar() {
  return (
    <nav className="bg-primary h-16 shrink-0 px-6 top-0 sticky border-b border-neutral-400 sm:hidden">
      <div className="flex items-center justify-between h-full">
        {/* Menu */}
        <div>
          <LuPanelLeftOpen className="text-neutral-200 size-7" />
        </div>
        {/* Label/Header */}
        <div>
          <h1 className="text-neutral-50 text-h6 font-bold">
            Duct Daddy
          </h1>
        </div>
        {/* Action */}
        <div>
          <div>
            <LuEllipsisVertical className="text-neutral-200 size-7" />
          </div>
        </div>
      </div>
    </nav>
  );
}