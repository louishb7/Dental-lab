CREATE TABLE "persistent_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "auth_version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    CONSTRAINT "persistent_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "persistent_sessions_token_hash_key" ON "persistent_sessions"("token_hash");
CREATE INDEX "ix_persistent_sessions_user_revoked" ON "persistent_sessions"("user_id", "revoked_at");
ALTER TABLE "persistent_sessions" ADD CONSTRAINT "persistent_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
