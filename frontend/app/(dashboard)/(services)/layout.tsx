import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services | Daddy Enterprise Suite",
  description: "Manage service book",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
