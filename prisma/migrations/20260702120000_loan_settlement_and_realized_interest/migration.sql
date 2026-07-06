ALTER TYPE "LoanStatus" ADD VALUE IF NOT EXISTS 'LUNAS';
ALTER TABLE "loan_payments" ADD COLUMN "principalComponent" DECIMAL(18,2) NOT NULL DEFAULT 0, ADD COLUMN "interestComponent" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "business_income" DROP CONSTRAINT IF EXISTS "business_income_loanId_key";
ALTER TABLE "business_income" ADD COLUMN "loanPaymentId" TEXT;
CREATE UNIQUE INDEX "business_income_loanPaymentId_key" ON "business_income"("loanPaymentId");
ALTER TABLE "business_income" ADD CONSTRAINT "business_income_loanPaymentId_fkey" FOREIGN KEY ("loanPaymentId") REFERENCES "loan_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
DELETE FROM "business_income";
