import Link from "next/link";
import { LuUserRoundPlus } from "react-icons/lu";

export default function EmployeesPage() {
  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-neutral-900 text-h4 font-bold">
          Employees
        </h1>
        <Link
          href='/add-employee'
          className="bg-primary text-neutral-100 py-2 px-4 rounded-lg flex items-center gap-x-2 transition-colors duraiton-300 ease-in-out hover:bg-primary/90"
        >
          <LuUserRoundPlus className="size-6" />
          <p className="text-p font-bold">
            Add Employee
          </p>
        </Link>
      </div>

      <div className="bg-neutral-50 border border-neutral-400 overflow-hidden rounded-lg py-6 px-6 mt-8">
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="w-72 text-left text-neutral-600 text-p">Name</th>
              <th className="w-60 text-left text-neutral-600 text-p">Phone</th>
              <th className="w-72 text-left text-neutral-600 text-p">Email</th>
              <th className="w-72 text-left text-neutral-600 text-p">Position</th>
              <th className="w-60 text-left text-neutral-600 text-p">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <th className="text-neutral-800 text-p text-left pt-6">John Doe</th>
              <th className="text-neutral-800 text-p text-left pt-6">+1 (209) 494-2440</th>
              <th className="text-neutral-800 text-p text-left pt-6">john@gmail.com</th>
              <th className="text-neutral-800 text-p text-left pt-6">Technician</th>
              <th className="text-neutral-800 text-p text-left pt-6">Update Delete</th>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}