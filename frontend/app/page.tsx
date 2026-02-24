"use client";

// import { selectUser } from "@/features/auth/authSlice";
// import Link from "next/link";
// import { useSelector } from "react-redux";

export default function HomePage() {
  // const user = useSelector(selectUser);

  return (
    <main className="min-h-screen">
      <h1>Dashboard</h1>
      {/* <header className="">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-xl font-semibold text-neutral-900">
            Daddy Enterprise Suite
          </span>
          <nav>
            {user ? (
              <Link href='/dashboard'>
                Dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-6">
                <Link
                  href="/login"
                  className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Get started
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
          Run your field operations in one place
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600">
          Daddy Enterprise Suite gives your team dispatch, scheduling, and
          job tracking so you can deliver for customers without the chaos.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-md bg-primary px-6 py-3 text-base font-medium text-white hover:opacity-90"
          >
            Start free trial
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-neutral-300 bg-white px-6 py-3 text-base font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-semibold text-neutral-900">
            Built for teams that move
          </h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <li className="rounded-lg border border-neutral-200 p-6">
              <h3 className="font-medium text-neutral-900">Dispatch</h3>
              <p className="mt-2 text-sm text-neutral-600">
                Assign jobs to technicians and keep everyone on the same page.
              </p>
            </li>
            <li className="rounded-lg border border-neutral-200 p-6">
              <h3 className="font-medium text-neutral-900">Scheduling</h3>
              <p className="mt-2 text-sm text-neutral-600">
                Manage calendars and avoid double-booking with a single view.
              </p>
            </li>
            <li className="rounded-lg border border-neutral-200 p-6">
              <h3 className="font-medium text-neutral-900">Reporting</h3>
              <p className="mt-2 text-sm text-neutral-600">
                Track completion and performance with role-based dashboards.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <footer className="border-t border-neutral-200 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-neutral-500">
          © {new Date().getFullYear()} Built by Daddy. All rights reserved.
        </div>
      </footer> */}
    </main>
  );
}
