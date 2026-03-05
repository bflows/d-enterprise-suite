/*
  Warnings:

  - Changed the type of `price` on the `ServiceItem` table. Existing string values are cast to integer (non-numeric/empty become 0).
  - Changed the type of `duration` on the `ServiceItem` table. Existing string values are cast to integer (non-numeric/empty become 0).

*/
-- AlterTable: cast existing string columns to integer (non-integer/empty -> 0 to satisfy NOT NULL)
ALTER TABLE "ServiceItem"
  ALTER COLUMN "price" TYPE INTEGER USING (
    CASE WHEN TRIM("price") ~ '^-?[0-9]+$' THEN TRIM("price")::INTEGER ELSE 0 END
  ),
  ALTER COLUMN "duration" TYPE INTEGER USING (
    CASE WHEN TRIM("duration") ~ '^-?[0-9]+$' THEN TRIM("duration")::INTEGER ELSE 0 END
  );
