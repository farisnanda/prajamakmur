import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { allocatePayment } from "@/lib/annuity";
import { KAS_UMUM_BANK } from "@/lib/cashAccounts";

type Db = PrismaClient | Prisma.TransactionClient;

export type RebalanceChange = {
  paymentId: string;
  receiptNumber: string;
  loanId: string;
  loanNumber: string;
  memberName: string;
  installmentNumber: number;
  paymentDate: Date;
  amount: number;
  oldInterest: number;
  newInterest: number;
  oldPrincipal: number;
  newPrincipal: number;
};

const cents = (value: number) => Math.round(value * 100) / 100;

/**
 * Hitung ulang pembagian bunga dan pokok semua angsuran yang sudah tercatat
 * dengan aturan "seluruh bunga dibayar lebih dulu dari cicilan awal".
 * Hanya membaca; hasilnya daftar angsuran yang pembagiannya berubah.
 * Aman dijalankan berulang: angsuran yang sudah sesuai tidak muncul lagi.
 */
export async function planRebalance(db: Db) {
  const loans = await db.loan.findMany({
    where: { status: { in: ["ACTIVE", "LUNAS"] }, monthlyPayment: { not: null } },
    select: {
      id: true,
      loanNumber: true,
      principalAmount: true,
      tenureMonths: true,
      monthlyPayment: true,
      member: { select: { name: true } },
      payments: {
        orderBy: [{ installmentNumber: "asc" }, { paymentDate: "asc" }],
        select: {
          id: true,
          receiptNumber: true,
          installmentNumber: true,
          paymentDate: true,
          amount: true,
          principalComponent: true,
          interestComponent: true,
        },
      },
    },
  });

  const changes: RebalanceChange[] = [];
  const affectedLoans = new Set<string>();
  for (const loan of loans) {
    const principal = loan.principalAmount.toNumber();
    const monthly = loan.monthlyPayment?.toNumber() ?? 0;
    let paidInterest = 0;
    for (const payment of loan.payments) {
      const amount = payment.amount.toNumber();
      const next = allocatePayment({
        principal,
        monthly,
        months: loan.tenureMonths,
        paidInterest,
        amount,
      });
      const newInterest = cents(next.interestComponent);
      const newPrincipal = cents(amount - newInterest);
      paidInterest += newInterest;

      const oldInterest = payment.interestComponent.toNumber();
      const oldPrincipal = payment.principalComponent.toNumber();
      if (Math.abs(newInterest - oldInterest) > 0.005 || Math.abs(newPrincipal - oldPrincipal) > 0.005) {
        affectedLoans.add(loan.id);
        changes.push({
          paymentId: payment.id,
          receiptNumber: payment.receiptNumber,
          loanId: loan.id,
          loanNumber: loan.loanNumber,
          memberName: loan.member.name,
          installmentNumber: payment.installmentNumber,
          paymentDate: payment.paymentDate,
          amount,
          oldInterest,
          newInterest,
          oldPrincipal,
          newPrincipal,
        });
      }
    }
  }
  return { changes, loanCount: affectedLoans.size, totalLoans: loans.length };
}

/** Terapkan hasil `planRebalance`: angsuran, pendapatan bunga, dan rincian kas. Jalankan di dalam transaksi. */
export async function applyRebalance(tx: Prisma.TransactionClient, changes: RebalanceChange[]) {
  const bank = await tx.cashAccount.findUnique({ where: { code: KAS_UMUM_BANK } });

  for (const change of changes) {
    await tx.loanPayment.update({
      where: { id: change.paymentId },
      data: {
        interestComponent: new Prisma.Decimal(change.newInterest),
        principalComponent: new Prisma.Decimal(change.newPrincipal),
      },
    });

    // Angsuran hasil migrasi tidak punya kas atau pendapatan, jadi tidak ada yang disinkronkan.
    if (change.receiptNumber.startsWith("MIG-")) continue;

    // Pendapatan bunga
    const income = await tx.businessIncome.findUnique({ where: { loanPaymentId: change.paymentId } });
    if (change.newInterest > 0) {
      if (income) {
        await tx.businessIncome.update({
          where: { id: income.id },
          data: { amount: new Prisma.Decimal(change.newInterest) },
        });
      } else {
        await tx.businessIncome.create({
          data: {
            reference: `HU-${change.receiptNumber}`,
            loanId: change.loanId,
            loanPaymentId: change.paymentId,
            amount: new Prisma.Decimal(change.newInterest),
            recognizedAt: change.paymentDate,
            description: `Bunga jasa angsuran ${change.loanNumber}`,
          },
        });
      }
    } else if (income) {
      await tx.businessIncome.delete({ where: { id: income.id } });
    }

    // Rincian kas (total uang yang masuk tidak berubah, hanya dibagi pokok dan bunga)
    const principalRef = `KAS-POKOK-${change.receiptNumber}`;
    const interestRef = `KAS-BUNGA-${change.receiptNumber}`;
    const [principalRow, interestRow] = await Promise.all([
      tx.cashTransaction.findUnique({ where: { reference: principalRef } }),
      tx.cashTransaction.findUnique({ where: { reference: interestRef } }),
    ]);
    const base = principalRow ?? interestRow;
    if (!base && !bank) continue;
    if (!base) continue;

    const sync = async (
      existing: typeof principalRow,
      reference: string,
      amount: number,
      label: string,
    ) => {
      if (amount > 0) {
        if (existing) {
          await tx.cashTransaction.update({
            where: { id: existing.id },
            data: { amount: new Prisma.Decimal(amount) },
          });
        } else {
          await tx.cashTransaction.create({
            data: {
              reference,
              accountId: base.accountId,
              type: "INFLOW",
              amount: new Prisma.Decimal(amount),
              transactionDate: base.transactionDate,
              description: `Pembayaran ${label} Pinjaman ${change.memberName} angsuran ke-${change.installmentNumber}`,
              note: base.note,
            },
          });
        }
      } else if (existing) {
        await tx.cashTransaction.delete({ where: { id: existing.id } });
      }
    };
    await sync(principalRow, principalRef, change.newPrincipal, "Pokok");
    await sync(interestRow, interestRef, change.newInterest, "Bunga");
  }
}
