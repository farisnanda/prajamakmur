/** Angsuran bulanan anuitas, dibulatkan ke atas (sama dengan saat pencairan). */
export function annuityPayment(principal: number, annualRate: number, months: number) {
  const rate = annualRate / 100 / 12;
  return Math.ceil(
    rate === 0
      ? principal / months
      : (principal * rate * (1 + rate) ** months) / ((1 + rate) ** months - 1),
  );
}

/** Jadwal angsuran: pokok dan bunga tiap bulan, serta sisa pokok sesudahnya. */
export function annuitySchedule(
  principal: number,
  annualRate: number,
  months: number,
  count = months,
) {
  const payment = annuityPayment(principal, annualRate, months);
  const rate = annualRate / 100 / 12;
  let remaining = principal;
  const rows: {
    number: number;
    amount: number;
    principalComponent: number;
    interestComponent: number;
    remaining: number;
  }[] = [];
  for (let number = 1; number <= Math.min(count, months); number += 1) {
    const interest = Math.min(payment, remaining * rate);
    const principalComponent = Math.min(remaining, payment - interest);
    remaining -= principalComponent;
    rows.push({
      number,
      amount: principalComponent + interest,
      principalComponent,
      interestComponent: interest,
      remaining: Math.max(remaining, 0),
    });
  }
  return rows;
}
