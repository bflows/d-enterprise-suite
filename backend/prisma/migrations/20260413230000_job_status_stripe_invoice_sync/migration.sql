-- AlterEnum: invoice-aligned job statuses (Stripe webhook sync)
ALTER TYPE "JobStatusType" ADD VALUE 'VOID';
ALTER TYPE "JobStatusType" ADD VALUE 'UNCOLLECTIBLE';
ALTER TYPE "JobStatusType" ADD VALUE 'OVERDUE';
