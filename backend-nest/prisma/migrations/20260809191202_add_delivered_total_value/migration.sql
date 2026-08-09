ALTER TABLE "cases" ADD COLUMN "delivered_total_value" DECIMAL(10,2);
ALTER TABLE "cases" ADD CONSTRAINT "ck_cases_delivered_total_value_non_negative" CHECK ("delivered_total_value" IS NULL OR "delivered_total_value" >= 0);
UPDATE "cases" SET "delivered_total_value" = "total_value" WHERE "status" = 'delivered' AND "delivered_total_value" IS NULL;
