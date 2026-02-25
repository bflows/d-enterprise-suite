import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Employee | Daddy Enterprise Suite",
  description: "Built by Daddy Company",
};

export default function NewEmployeePage() {
  return (
    <div>
      <h1 className="text-neutral-900 text-h4 font-bold">
        New Employee
      </h1>
    </div>
  );
}