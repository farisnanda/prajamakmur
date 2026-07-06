ALTER TABLE "users" ADD COLUMN "memberId" TEXT;
CREATE UNIQUE INDEX "users_memberId_key" ON "users"("memberId");
ALTER TABLE "users" ADD CONSTRAINT "users_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
