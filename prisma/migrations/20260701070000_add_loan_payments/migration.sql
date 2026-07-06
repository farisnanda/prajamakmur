CREATE TABLE "loan_payments" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loan_payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "loan_payments_receiptNumber_key" ON "loan_payments"("receiptNumber");
CREATE INDEX "loan_payments_loanId_paymentDate_idx" ON "loan_payments"("loanId", "paymentDate");
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
