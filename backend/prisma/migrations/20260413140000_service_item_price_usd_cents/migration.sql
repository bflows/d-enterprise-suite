-- ServiceItem.price was stored as whole USD dollars; API and Stripe use integer cents.
UPDATE "ServiceItem" SET "price" = "price" * 100;
