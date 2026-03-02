import Link from "next/link";
import { LuBookUser, LuHouse, LuUsers } from "react-icons/lu";

export default function DashboardSidebar() {
  return (
    <aside className="hidden bg-neutral-50 sm:block sm:w-28 md:w-64">
      {/* Container */}
      <div className="py-6 px-8 flex flex-col items-center md:items-start">
        {/* Header */}
        <div>
          <h1 className="text-neutral-900 text-h6 font-bold hidden md:block">
            Duct Daddy
          </h1>
        </div>

        {/* Links */}
        <div className="mt-8 flex flex-col gap-y-2 md:gap-y-4">
          {/* Home */}
          <div>
            <h2 className="text-neutral-400 text-small uppercase font-bold hidden md:block">
              Home
            </h2>
            <ul className="mt-1">
              <li>
                <Link href='/dashboard' className="flex items-center gap-x-2 px-4 py-2 rounded-lg group transition-colors duration-300 ease-in-out hover:bg-primary/10">
                  <div>
                    <LuHouse className="text-neutral-600 size-6 transition-colors duration-300 ease-in-out group-hover:text-primary" />
                  </div>
                  <span className="text-neutral-600 hidden md:block text-p font-bold transition-colors duration-300 ease-in-out group-hover:text-primary">
                    Dashboard
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h2 className="text-neutral-400 text-small uppercase font-bold hidden md:block">
              Company
            </h2>
            <ul className="mt-1 flex flex-col gap-y-1">
              <li>
                <Link href='/customers' className="flex items-center gap-x-2 px-4 py-2 rounded-lg group transition-colors duration-300 ease-in-out hover:bg-primary/10">
                  <div>
                    <LuBookUser className="text-neutral-600 size-6 transition-colors duration-300 ease-in-out group-hover:text-primary" />
                  </div>
                  <span className="text-neutral-600 hidden md:block text-p font-bold transition-colors duration-300 ease-in-out group-hover:text-primary">
                    Customers
                  </span>
                </Link>
              </li>
              <li>
                <Link href='/employees' className="flex items-center gap-x-2 px-4 py-2 rounded-lg group transition-colors duration-300 ease-in-out hover:bg-primary/10">
                  <div>
                    <LuUsers className="text-neutral-600 size-6 transition-colors duration-300 ease-in-out group-hover:text-primary" />
                  </div>
                  <span className="text-neutral-600 hidden md:block text-p font-bold transition-colors duration-300 ease-in-out group-hover:text-primary">
                    Employees
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}