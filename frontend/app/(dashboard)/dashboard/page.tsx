"use client";

// import { useSelector } from "react-redux";
// import Link from "next/link";
// import { selectUser } from "@/features/auth/authSlice";

export default function DashboardPage() {
  // const user = useSelector(selectUser);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-neutral-900 text-h4 font-bold">Dashboard</h1>
      {/* <p className="mt-1 text-neutral-600">
        Welcome back, {user?.firstName ?? "User"}.
      </p>
      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-medium text-neutral-500">Your account</h2>
        <dl className="mt-2 space-y-1 text-sm">
          <div>
            <dt className="inline font-medium text-neutral-700">Email:</dt>{" "}
            <dd className="inline text-neutral-600">{user?.email}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-neutral-700">Name:</dt>{" "}
            <dd className="inline text-neutral-600">
              {user?.firstName} {user?.lastName}
            </dd>
          </div>
          <div>
            <dt className="inline font-medium text-neutral-700">Phone:</dt>{" "}
            <dd className="inline text-neutral-600">{user?.phoneNumber}</dd>
          </div>
          {user?.role && (
            <div>
              <dt className="inline font-medium text-neutral-700">Role:</dt>{" "}
              <dd className="inline capitalize text-neutral-600">{user.role}</dd>
            </div>
          )}
        </dl>
      </div>
      <p className="mt-4 text-sm text-neutral-500">
        <Link href="/" className="text-primary hover:underline">
          Back to home
        </Link>
      </p> */}
    </div>
  );
}
