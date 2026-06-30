-- CreateEnum
CREATE TYPE "SavingsType" AS ENUM ('POKOK', 'WAJIB', 'SUKARELA');

-- CreateEnum
CREATE TYPE "SavingsTransactionType" AS ENUM ('SETORAN', 'PENARIKAN');

-- CreateTable
CREATE TABLE "savings_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "principalAmount" DECIMAL(18,2) NOT NULL DEFAULT 500000,
    "mandatoryAmount" DECIMAL(18,2) NOT NULL DEFAULT 300000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_transactions" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "savingsType" "SavingsType" NOT NULL,
    "transactionType" "SavingsTransactionType" NOT NULL DEFAULT 'SETORAN',
    "amount" DECIMAL(18,2) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodKey" TEXT,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "savings_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "savings_transactions_receiptNumber_key" ON "savings_transactions"("receiptNumber");

-- CreateIndex
CREATE INDEX "savings_transactions_memberId_transactionDate_idx" ON "savings_transactions"("memberId", "transactionDate");

-- CreateIndex
CREATE INDEX "savings_transactions_savingsType_transactionDate_idx" ON "savings_transactions"("savingsType", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "savings_transactions_memberId_savingsType_periodKey_key" ON "savings_transactions"("memberId", "savingsType", "periodKey");

-- AddForeignKey
ALTER TABLE "savings_transactions" ADD CONSTRAINT "savings_transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_transactions" ADD CONSTRAINT "savings_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
