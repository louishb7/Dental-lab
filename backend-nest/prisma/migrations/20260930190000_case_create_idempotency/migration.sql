BEGIN;

ALTER TABLE "cases" ADD COLUMN "client_request_id" UUID;
CREATE UNIQUE INDEX "uq_cases_user_client_request_id"
  ON "cases"("user_id", "client_request_id");

COMMIT;
