import type { Job } from "./types";

// Mock jobs for demo — replace with API when backend is ready
export const MOCK_JOBS: Job[] = [
  {
    id: "1",
    title: "AC Install - Smith",
    date: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endTime: "12:00",
    status: "scheduled",
    customerName: "John Smith",
    address: "123 Main St",
    notes: "Bring 2-ton unit",
  },
  {
    id: "2",
    title: "Furnace Repair",
    date: new Date().toISOString().slice(0, 10),
    startTime: "14:00",
    endTime: "15:30",
    status: "in_progress",
    customerName: "Jane Doe",
    address: "456 Oak Ave",
  },
  {
    id: "3",
    title: "Duct Cleaning",
    date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })(),
    startTime: "10:00",
    endTime: "11:30",
    status: "scheduled",
    customerName: "Bob Wilson",
    address: "789 Pine Rd",
  },
  {
    id: "4",
    title: "Thermostat Install",
    date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      return d.toISOString().slice(0, 10);
    })(),
    startTime: "08:00",
    status: "scheduled",
    customerName: "Alice Brown",
  },
  {
    id: "5",
    title: "Emergency Repair",
    date: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    })(),
    startTime: "16:00",
    status: "completed",
    customerName: "Mike Jones",
  },
];
