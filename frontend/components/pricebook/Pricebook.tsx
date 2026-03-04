"use client";

import { LuBookPlus, LuEllipsisVertical } from "react-icons/lu";
import Modal from "../ui/Modal";
import { useState } from "react";

export default function Pricebook() {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    setIsOpen(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-neutral-900 text-h4 font-bold">Services</h1>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="bg-primary text-neutral-200 text-p font-bold py-3 px-4 rounded-lg flex items-center gap-x-2 cursor-pointer transition-colors hover:bg-primary/90 hover:text-neutral-50"
        >
          <div>
            <LuBookPlus className="size-6" />
          </div>
          New Industry
        </button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="New Industry"
        primaryAction={{ label: "Confirm", onClick: handleConfirm }}
      >
        <div className="flex flex-col">
          <label htmlFor="industry">Title</label>
          <input
            type="text"
            id="industry"
            placeholder="E.g. HVAC, Air Duct Cleaning, Plumbing"
            className="bg-neutral-50 text-neutral-800 text-p px-4 py-2 mt-1 rounded-lg border border-neutral-400 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </Modal>

      <div className="mt-4">
        <div className="bg-neutral-50 w-fit px-6 py-4 rounded-2xl cursor-pointer flex items-center gap-x-4 border border-neutral-400">
          <p className="text-neutral-900 text-p">Air Duct Cleaning</p>

          <div className="text-neutral-600 p-1 rounded-lg transition-colors hover:bg-neutral-100 hover:text-neutral-800">
            <LuEllipsisVertical className="size-6" />
          </div>
        </div>
      </div>
    </div>
  );
}