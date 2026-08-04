-- CreateTable
CREATE TABLE "case_history_events" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "event_type" VARCHAR(40) NOT NULL,
    "from_status" VARCHAR(20),
    "to_status" VARCHAR(20),
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_history_events_pkey" PRIMARY KEY ("id")
);

-- Custom SQL: workflow event/status values are constrained to the known first-version history contract.
ALTER TABLE "case_history_events"
    ADD CONSTRAINT "ck_case_history_events_event_type_valid"
    CHECK ("event_type" IN ('case_created', 'status_advanced', 'status_reverted'));

ALTER TABLE "case_history_events"
    ADD CONSTRAINT "ck_case_history_events_from_status_valid"
    CHECK ("from_status" IS NULL OR "from_status" IN ('pending', 'completed', 'delivered'));

ALTER TABLE "case_history_events"
    ADD CONSTRAINT "ck_case_history_events_to_status_valid"
    CHECK ("to_status" IS NULL OR "to_status" IN ('pending', 'completed', 'delivered'));

-- CreateIndex
CREATE INDEX "ix_case_history_events_case_id_created_at" ON "case_history_events"("case_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_case_history_events_user_id" ON "case_history_events"("user_id");

-- AddForeignKey
ALTER TABLE "case_history_events" ADD CONSTRAINT "case_history_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_history_events" ADD CONSTRAINT "case_history_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing records without fabricating unavailable intermediate transitions.
INSERT INTO "case_history_events" ("case_id", "user_id", "event_type", "from_status", "to_status", "created_at")
SELECT cases.id, doctors.user_id, 'case_created', NULL, 'pending', cases.created_at
FROM "cases" cases
JOIN "doctors" doctors ON doctors.id = cases.doctor_id
WHERE doctors.user_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "case_history_events" existing
      WHERE existing.case_id = cases.id
        AND existing.event_type = 'case_created'
  );

INSERT INTO "case_history_events" ("case_id", "user_id", "event_type", "from_status", "to_status", "created_at")
SELECT cases.id, doctors.user_id, 'status_advanced', NULL, 'delivered', cases.delivered_at
FROM "cases" cases
JOIN "doctors" doctors ON doctors.id = cases.doctor_id
WHERE doctors.user_id IS NOT NULL
  AND cases.status = 'delivered'
  AND cases.delivered_at IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "case_history_events" existing
      WHERE existing.case_id = cases.id
        AND existing.event_type = 'status_advanced'
        AND existing.to_status = 'delivered'
        AND existing.created_at = cases.delivered_at
  );
