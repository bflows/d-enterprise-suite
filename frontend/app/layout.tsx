import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ReduxProvider from "@/lib/reduxProvider";
import AuthHydration from "@/components/auth/AuthHydration";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daddy Enterprise Suite",
  description: "Built by Daddy Company",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${interSans.variable} antialiased`}
      >
        <ReduxProvider>
          <AuthHydration>
            {children}
          </AuthHydration>
        </ReduxProvider>
      </body>
    </html>
  );
}
