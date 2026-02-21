import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in | Daddy Enterprise Suite",
  description: "Built by Daddy Company",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      {children}
    </div>
  );
}
