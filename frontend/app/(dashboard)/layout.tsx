import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Dashboard | Daddy Enterprise Suite",
  description: "Built by Daddy Company",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <DashboardShell>{children}</DashboardShell>;
}
