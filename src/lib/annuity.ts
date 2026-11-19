/**
 * Aturan pinjaman Koperasi Praja Makmur:
 * - Cicilan per bulan tetap sama dengan hasil simulasi anuitas.
 * - Seluruh bunga (cicilan x tenor - pokok) dibayar lebih dulu, diambil dari
 *   cicilan-cicilan awal. Jika satu cicilan belum cukup, bulan berikutnya ikut
 *   dipakai. Sisa cicilan setelah bunga lunas mengurangi pokok.
 * - Cicilan berikutnya seluruhnya masuk ke pokok.
 */

/** Angsuran bulanan anuitas, dibulatkan ke rupiah terdekat (sama dengan simulasi). */
export function annuityPayment(principal: number, annualRate: number, months: number) {
  const rate = annualRate / 100 / 12;
  return Math.round(
    rate === 0
      ? principal / months
      : (principal * rate * (1 + rate) ** months) / ((1 + rate) ** months - 1),
  );
}

/** Total bunga selama tenor: seluruh cicilan dikurangi pokok. */
export function totalInterest(principal: number, monthly: number, months: number) {
  return Math.max(0, monthly * months - principal);
}

/**
 * Pembagian satu pembayaran: bunga yang belum lunas dibayar dulu,
 * sisanya menjadi pengurang pokok.
 */
export function allocatePayment(options: {
  principal: number;
  /** Cicilan per bulan pada pinjaman ini (nilai tersimpan). */
  monthly: number;
  months: number;
  /** Bunga yang sudah dibayar pada angsuran sebelumnya. */
  paidInterest: number;
  amount: number;
}) {
  const pool = Math.max(
    0,
    totalInterest(options.principal, options.monthly, options.months) -
      options.paidInterest,
  );
  const interestComponent = Math.min(options.amount, pool);
  return {
    interestComponent,
    principalComponent: options.amount - interestComponent,
  };
}

/** Jadwal angsuran: bunga dan pokok tiap bulan, serta sisa pokok sesudahnya. */
export function annuitySchedule(
  principal: number,
  annualRate: number,
  months: number,
  count = months,
) {
  const payment = annuityPayment(principal, annualRate, months);
  let remaining = principal;
  let paidInterest = 0;
  const rows: {
    number: number;
    amount: number;
    principalComponent: number;
    interestComponent: number;
    remaining: number;
  }[] = [];
  for (let number = 1; number <= Math.min(count, months); number += 1) {
    const { interestComponent, principalComponent } = allocatePayment({
      principal,
      monthly: payment,
      months,
      paidInterest,
      amount: payment,
    });
    paidInterest += interestComponent;
    // Cicilan terakhir tidak boleh melebihi sisa pokok.
    const principalPart = Math.min(principalComponent, remaining);
    remaining -= principalPart;
    rows.push({
      number,
      amount: principalPart + interestComponent,
      principalComponent: principalPart,
      interestComponent,
      remaining: Math.max(remaining, 0),
    });
  }
  return rows;
}
