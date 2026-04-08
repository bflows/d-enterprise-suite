import type { Job } from "@/lib/calendar/types";
import { HiCurrencyDollar, HiHashtag, HiListBullet } from "react-icons/hi2";

export interface JobLineItemsProps {
  job: Job;
  /** Absolute discount amount to subtract from subtotal. */
  discountAmount?: number;
}

function formatCurrency(value: number): string {
  return `${value.toFixed(2)}`;
}

export default function JobLineItems({ job, discountAmount = 0 }: JobLineItemsProps) {
  const services = job.services ?? [];
  const subtotal = services.reduce((acc, service) => acc + service.quantity * service.price, 0);
  const discount = Math.max(0, discountAmount);
  const total = Math.max(0, subtotal - discount);

  return (
    <section className="mt-4 rounded-lg border border-neutral-300 bg-neutral-50 p-4">
      <div>
        <div className="flex items-center gap-2 text-neutral-900">
          <HiListBullet className="size-6 shrink-0" aria-hidden />
          <h2 className="text-h6 font-bold md:text-h5">Line items</h2>
        </div>
      </div>
      <p className="mt-4 text-p uppercase text-neutral-600">Services</p>

      {services.length === 0 ? (
        <p className="mt-2 text-p text-neutral-600">No services added to this job.</p>
      ) : (
        <>
          <div className="mt-2">
            {services.map((service) => {
              const lineTotal = service.quantity * service.price;
              return (
                <div key={service.id}>
                  <div>
                    <h3 className="text-h6 font-bold text-neutral-900">{service.name}</h3>
                    {service.description?.trim() ? (
                      <p className="mt-2 text-p truncate text-neutral-800">{service.description}</p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-x-2">
                      <div className="flex items-center gap-x-1 py-1 px-3 w-fit rounded-full border border-neutral-300/50 bg-neutral-200/50">
                        <div>
                          <HiHashtag className="size-4 text-neutral-600" />
                        </div>
                        <p className="text-p text-neutral-800">{service.quantity}</p>
                      </div>
                      <div className="flex items-center gap-x-1 py-1 px-3 w-fit rounded-full border border-green-300/50 bg-green-300/50">
                        <div>
                          <HiCurrencyDollar className="size-6 text-green-500" />
                        </div>
                        <p className="text-small text-green-500">{formatCurrency(lineTotal)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-neutral-200 pt-2">
            <div className="flex items-center justify-between text-p text-neutral-700">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <hr className="pt-2 mt-2 border-t border-neutral-200" />
            {discount > 0 ? (
              <div className="flex items-center justify-between text-p text-neutral-700">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-p font-bold text-neutral-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}