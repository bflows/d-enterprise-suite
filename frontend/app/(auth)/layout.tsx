import type { Metadata } from "next";
import AuthLayoutRedirect from "@/components/auth/AuthLayoutRedirect";

export const metadata: Metadata = {
  title: "Log in | Daddy Enterprise Suite",
  description: "Built by Daddy Company",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthLayoutRedirect>
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        {children}
      </div>
    </AuthLayoutRedirect>
  );
}
