import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Time cards | Daddy Enterprise Suite",
  description: "Your recent time entries.",
};

export default function TimeCardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
