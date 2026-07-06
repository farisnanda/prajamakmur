/*
  Warnings:

  - Added the required column `installmentNumber` to the `loan_payments` table without a default value. Backfilled below before the NOT NULL constraint is applied.

*/
-- AlterTable
ALTER TABLE "landing_content" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "news_posts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable (nullable first so existing rows can be backfilled)
ALTER TABLE "loan_payments" ADD COLUMN     "installmentNumber" INTEGER;

-- Backfill installmentNumber: sequence of each loan's payments ordered by paymentDate
UPDATE "loan_payments" AS lp
SET "installmentNumber" = ranked.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "loanId" ORDER BY "paymentDate" ASC, "createdAt" ASC
  ) AS rn
  FROM "loan_payments"
) AS ranked
WHERE ranked.id = lp.id;

-- AlterTable
ALTER TABLE "loan_payments" ALTER COLUMN "installmentNumber" SET NOT NULL;

-- Data fix: installment schedule (startDate/dueDate) for already-active loans now
-- anchors to the month after the application date, matching the new disbursement rule,
-- instead of the historical disbursement timestamp.
UPDATE "loans"
SET
  "startDate" = date_trunc('month', "applicationDate") + INTERVAL '1 month',
  "dueDate" = date_trunc('month', "applicationDate") + INTERVAL '1 month' + ("tenureMonths" * INTERVAL '1 month')
WHERE status = 'ACTIVE';
