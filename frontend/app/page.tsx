"use client";

import { selectUser, selectHydrationDone } from "@/features/auth/authSlice";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSelector } from "react-redux";

export default function HomePage() {
  const user = useSelector(selectUser);
  const hydrationDone = useSelector(selectHydrationDone);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (user) {
    return null;
  }

  if (!hydrationDone) {
    return null;
  }

  return (
    <main className="bg-neutral-100">
      <div className="max-w-7xl mx-auto px-4 pt-64 pb-16 min-h-screen flex flex-col justify-between gap-y-8 md:px-6 md:pb-24">
        <header>
          <h1 className="text-h5 font-bold text-center text-neutral-900 md:text-h4">
            Daddy Enterprise Suite
          </h1>
          <p className="mt-2 text-p text-center max-w-md mx-auto text-neutral-800">
            Get started by logging in with your company details then head to the dashboard to start working.
          </p>
          <nav className="flex justify-center mt-4">
            {user ? (
              <Link
                href='/dashboard'
                className="py-4 px-8 text-p font-bold rounded-lg transition-colors duration-300 ease-in-out bg-primary/90 text-neutral-200 hover:bg-primary hover:text-neutral-50"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="py-4 px-8 text-p font-bold rounded-lg transition-colors duration-300 ease-in-out bg-primary/90 text-neutral-200 hover:bg-primary hover:text-neutral-50"
              >
                Log in
              </Link>
            )}
          </nav>
        </header>

        <footer>
          <p className="text-small text-neutral-600 text-center">
            © {new Date().getFullYear()} Duct Daddy. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
