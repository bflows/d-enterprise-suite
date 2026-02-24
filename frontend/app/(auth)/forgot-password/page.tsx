import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-neutral-900">Forgot password?</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Password reset is not yet implemented. Please contact your administrator
        or support to reset your password.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        Back to log in
      </Link>
    </div>
  );
}
