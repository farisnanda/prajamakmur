ALTER TABLE "loan_payments" ADD COLUMN "periodKey" TEXT;
CREATE UNIQUE INDEX "loan_payments_loanId_periodKey_key" ON "loan_payments"("loanId", "periodKey");
