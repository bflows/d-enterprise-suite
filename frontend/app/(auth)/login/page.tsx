"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/app/store";
import { login, selectAuthError } from "@/features/auth/authSlice";

function LoginFormFallback() {
  return (
    <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-7 w-24 rounded bg-neutral-200" />
      <div className="mt-2 h-4 w-64 rounded bg-neutral-100" />
      <div className="mt-6 space-y-4">
        <div className="h-10 rounded-md bg-neutral-100" />
        <div className="h-10 rounded-md bg-neutral-100" />
        <div className="h-10 rounded-md bg-neutral-200" />
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const error = useSelector(selectAuthError);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await dispatch(login({ email: email.trim(), password }));
      if (login.fulfilled.match(result)) {
        router.push(redirect);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full sm:max-w-sm rounded-lg sm:border sm:border-neutral-200 bg-neutral-50 p-6">
      <h1 className="text-h5 font-bold text-neutral-950">
        Daddy Enterprise Suite
      </h1>
      <p className="mt-2 text-p text-neutral-600">
        Enter your credentials to start working.
      </p>
      {/* <h1 className="text-h4 font-bold text-neutral-950 md:text-h4">
        Log in
      </h1>
      <p className="mt-2 text-p text-neutral-600">
        Enter your email and password to access Daddy Enterprise Suite.
      </p> */}

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="mt-4">
          <label htmlFor="login-email" className="text-small text-neutral-600">
            Email <span className="text-secondary">*</span>
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            // required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-neutral-100 border-neutral-200 px-3 py-2 transition-colors duration-300 ease-in-out text-neutral-800 placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="you@ductdaddykc.com"
          />
        </div>
        <div className="mt-4">
          <label htmlFor="login-password" className="text-small text-neutral-600">
            Password <span className="text-secondary">*</span>
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            // required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full rounded-lg border bg-neutral-100 border-neutral-200 px-3 py-2 transition-colors duration-300 ease-in-out text-neutral-800 placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <Link
            href="/forgot-password"
            className="text-small text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        {error && (
          <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-lg py-2 text-p font-bold transition-colors duration-300 ease-in-out cursor-pointer bg-primary/90 text-neutral-200 hover:bg-primary hover:text-neutral-50 disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="size-6 animate-spin rounded-full border-2 border-neutral-50 border-r-transparent" />
              <p className="sr-only">Loading customer...</p>
            </div>
          ) : "Log in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
