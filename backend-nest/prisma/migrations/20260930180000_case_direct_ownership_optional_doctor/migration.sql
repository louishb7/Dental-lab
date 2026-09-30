-- Preserve every existing case by deriving its owner from its current doctor.
BEGIN;

ALTER TABLE "cases" ADD COLUMN "user_id" INTEGER;

UPDATE "cases" AS c
SET "user_id" = d."user_id"
FROM "doctors" AS d
WHERE c."doctor_id" = d."id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "cases" WHERE "user_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot assign every existing case to a user';
  END IF;
END $$;

ALTER TABLE "cases" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "cases" ALTER COLUMN "doctor_id" DROP NOT NULL;

CREATE INDEX "ix_cases_user_id" ON "cases"("user_id");
ALTER TABLE "cases"
  ADD CONSTRAINT "fk_cases_user_id_users"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
