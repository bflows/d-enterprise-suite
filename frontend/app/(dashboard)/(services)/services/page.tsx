import Pricebook from "@/components/pricebook/Pricebook";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services | Daddy Enterprise Suite",
  description: "Manage service book",
};

export default function ServicesPage() {
  return (
    <div>
      <Pricebook />
    </div>
  );
}