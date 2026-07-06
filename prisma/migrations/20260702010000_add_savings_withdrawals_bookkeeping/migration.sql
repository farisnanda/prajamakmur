CREATE TYPE "WithdrawalStatus" AS ENUM ('SUBMITTED','TRANSFERRED');
CREATE TABLE "savings_withdrawal_requests" ("id" TEXT NOT NULL,"requestNumber" TEXT NOT NULL,"memberId" TEXT NOT NULL,"amount" DECIMAL(18,2) NOT NULL,"bankName" TEXT NOT NULL,"accountNumber" TEXT NOT NULL,"accountHolder" TEXT NOT NULL,"note" TEXT,"status" "WithdrawalStatus" NOT NULL DEFAULT 'SUBMITTED',"transferReference" TEXT,"transferredAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "savings_withdrawal_requests_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "savings_withdrawal_requests_requestNumber_key" ON "savings_withdrawal_requests"("requestNumber");
CREATE INDEX "savings_withdrawal_requests_status_createdAt_idx" ON "savings_withdrawal_requests"("status","createdAt");
ALTER TABLE "savings_withdrawal_requests" ADD CONSTRAINT "savings_withdrawal_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "bookkeeping_entries" ("id" TEXT NOT NULL,"reference" TEXT NOT NULL,"transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"description" TEXT NOT NULL,"debitAccount" TEXT NOT NULL,"creditAccount" TEXT NOT NULL,"amount" DECIMAL(18,2) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "bookkeeping_entries_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "bookkeeping_entries_reference_key" ON "bookkeeping_entries"("reference");
CREATE INDEX "bookkeeping_entries_transactionDate_idx" ON "bookkeeping_entries"("transactionDate");
