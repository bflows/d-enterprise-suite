import Link from "next/link";
import { LuHouse, LuUsers } from "react-icons/lu";

export default function DashboardSidebar() {
  return (
    <nav className="w-80 py-8 px-6 bg-neutral-50 border-r border-neutral-400">
      <div className="">
        <div className="w-12 h-12 bg-neutral-200"></div>
        <h1 className="text-neutral-900 text-h5 font-bold mt-4">
          Duct Daddy
        </h1>
      </div>

      {/* Company */}
      <div className="mt-16">
        <h2 className="text-neutral-400 text-small uppercase font-bold">
          Home
        </h2>
        <ul className="mt-2">
          <li>
            <Link href='/dashboard' className="flex items-center gap-x-2 px-4 py-2 rounded-lg group transition-colors duration-300 ease-in-out hover:bg-primary/10">
              <LuHouse className="text-neutral-600 size-6 transition-colors duration-300 ease-in-out group-hover:text-primary" />
              <span className="text-neutral-600 text-p font-bold transition-colors duration-300 ease-in-out group-hover:text-primary">
                Dashboard
              </span>
            </Link>
          </li>
        </ul>
      </div>

      {/* Company */}
      <div className="mt-8">
        <h2 className="text-neutral-400 text-small uppercase font-bold">
          Company
        </h2>
        <ul className="mt-2">
          <li>
            <Link href='/employees' className="flex items-center gap-x-2 px-4 py-2 rounded-lg group transition-colors duration-300 ease-in-out hover:bg-primary/10">
              <LuUsers className="text-neutral-600 size-6 transition-colors duration-300 ease-in-out group-hover:text-primary" />
              <span className="text-neutral-600 text-p font-bold transition-colors duration-300 ease-in-out group-hover:text-primary">
                Employees
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}