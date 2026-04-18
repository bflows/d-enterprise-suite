import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="w-full sm:max-w-sm sm:rounded-lg sm:border sm:border-neutral-200 bg-neutral-50 p-6">
      <h1 className="text-h6 font-bold text-neutral-950 md:text-h5">
        Forgot password?
      </h1>
      <p className="mt-2 text-p text-neutral-600">
        Please contact your administrator or support to reset your password.
      </p>
      <Link
        href="/login"
        className="mt-4 py-2 px-4 rounded-lg inline-block text-p font-bold transition-colors duration-300 ease-in-out bg-primary/90 text-neutral-200 hover:bg-primary hover:text-neutral-50"
      >
        Back to log in
      </Link>
    </div>
  );
}
