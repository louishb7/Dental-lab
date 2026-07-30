-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(80) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "last_failed_login_at" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "name" VARCHAR(150) NOT NULL,
    "clinic_name" VARCHAR(150),
    "phone" VARCHAR(50),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "patient_ref" VARCHAR(150) NOT NULL,
    "pricing_mode" VARCHAR(20) NOT NULL DEFAULT 'services',
    "deadline" TIMESTAMPTZ(6),
    "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "total_value" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "status_revert_reason" TEXT,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_items" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "tooth" VARCHAR(100) NOT NULL,
    "service_type" VARCHAR(100) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_value" DECIMAL(10,2),
    "material" VARCHAR(100),
    "color" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "case_items_pkey" PRIMARY KEY ("id")
);

-- Legacy unique constraints
ALTER TABLE "users" ADD CONSTRAINT "uq_users_email" UNIQUE ("email");
ALTER TABLE "users" ADD CONSTRAINT "uq_users_username" UNIQUE ("username");

-- Custom SQL parity: functional case-insensitive uniqueness from Alembic.
CREATE UNIQUE INDEX "uq_users_email_lower" ON "users" (lower("email"));
CREATE UNIQUE INDEX "uq_users_username_lower" ON "users" (lower("username"));

-- Custom SQL parity: check constraints that Prisma schema cannot express directly.
ALTER TABLE "cases"
    ADD CONSTRAINT "ck_cases_priority_valid"
    CHECK ("priority" IN ('normal', 'urgent'));

ALTER TABLE "cases"
    ADD CONSTRAINT "ck_cases_status_valid"
    CHECK ("status" IN ('pending', 'completed', 'delivered'));

ALTER TABLE "cases"
    ADD CONSTRAINT "ck_cases_total_value_non_negative"
    CHECK ("total_value" IS NULL OR "total_value" >= 0);

ALTER TABLE "cases"
    ADD CONSTRAINT "ck_cases_pricing_mode_valid"
    CHECK ("pricing_mode" IN ('fixed', 'services'));

ALTER TABLE "case_items"
    ADD CONSTRAINT "ck_case_items_unit_value_non_negative"
    CHECK ("unit_value" IS NULL OR "unit_value" >= 0);

ALTER TABLE "case_items"
    ADD CONSTRAINT "ck_case_items_quantity_positive"
    CHECK ("quantity" >= 1);

-- CreateIndex
CREATE INDEX "ix_doctors_user_id" ON "doctors"("user_id");

-- CreateIndex
CREATE INDEX "ix_doctors_name" ON "doctors"("name");

-- CreateIndex
CREATE INDEX "ix_doctors_deleted_at" ON "doctors"("deleted_at");

-- CreateIndex
CREATE INDEX "ix_cases_doctor_id" ON "cases"("doctor_id");

-- CreateIndex
CREATE INDEX "ix_cases_patient_ref" ON "cases"("patient_ref");

-- CreateIndex
CREATE INDEX "ix_cases_priority" ON "cases"("priority");

-- CreateIndex
CREATE INDEX "ix_cases_status" ON "cases"("status");

-- CreateIndex
CREATE INDEX "ix_cases_deleted_at" ON "cases"("deleted_at");

-- CreateIndex
CREATE INDEX "ix_case_items_case_id" ON "case_items"("case_id");

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "fk_doctors_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_items" ADD CONSTRAINT "case_items_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
