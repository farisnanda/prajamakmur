import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allocatePayment,
  annuityPayment,
  annuitySchedule,
  totalInterest,
} from "../src/lib/annuity";

describe("annuityPayment", () => {
  it("matches the simulator for Rp50 juta, 20 bulan, 10%", () => {
    assert.equal(annuityPayment(50_000_000, 10, 20), 2_724_496);
  });

  it("matches the simulator for Rp10 juta, 12 bulan, 10%", () => {
    assert.equal(annuityPayment(10_000_000, 10, 12), 879_159);
  });

  it("splits evenly when the rate is zero", () => {
    assert.equal(annuityPayment(12_000_000, 0, 12), 1_000_000);
  });
});

describe("totalInterest", () => {
  it("is installment x tenor - principal (the user's worked example)", () => {
    const monthly = annuityPayment(50_000_000, 10, 20);
    assert.equal(monthly * 20, 54_489_920);
    assert.equal(totalInterest(50_000_000, monthly, 20), 4_489_920);
  });

  it("never goes negative", () => {
    assert.equal(totalInterest(1_000_000, 10, 1), 0);
  });
});

describe("allocatePayment (all interest is paid first)", () => {
  const base = { principal: 50_000_000, monthly: 2_724_496, months: 20 };

  it("month 1 is all interest", () => {
    const r = allocatePayment({ ...base, paidInterest: 0, amount: 2_724_496 });
    assert.equal(r.interestComponent, 2_724_496);
    assert.equal(r.principalComponent, 0);
  });

  it("month 2 pays the remaining interest then reduces principal", () => {
    const r = allocatePayment({ ...base, paidInterest: 2_724_496, amount: 2_724_496 });
    assert.equal(r.interestComponent, 1_765_424);
    assert.equal(r.principalComponent, 959_072);
  });

  it("goes entirely to principal once interest is cleared", () => {
    const r = allocatePayment({ ...base, paidInterest: 4_489_920, amount: 2_724_496 });
    assert.equal(r.interestComponent, 0);
    assert.equal(r.principalComponent, 2_724_496);
  });

  it("handles a partial payment smaller than the open interest", () => {
    const r = allocatePayment({ ...base, paidInterest: 0, amount: 1_000_000 });
    assert.equal(r.interestComponent, 1_000_000);
    assert.equal(r.principalComponent, 0);
  });

  it("always splits the amount exactly", () => {
    for (const paidInterest of [0, 1_000_000, 4_000_000, 4_489_920]) {
      const r = allocatePayment({ ...base, paidInterest, amount: 2_724_496 });
      assert.equal(r.interestComponent + r.principalComponent, 2_724_496);
    }
  });
});

describe("annuitySchedule", () => {
  it("repays exactly the principal over the whole tenor", () => {
    for (const [principal, months] of [
      [50_000_000, 20],
      [10_000_000, 12],
      [40_000_000, 7],
      [1_000_000, 1],
    ] as const) {
      const rows = annuitySchedule(principal, 10, months);
      assert.equal(rows.length, months);
      const paid = rows.reduce((sum, r) => sum + r.principalComponent, 0);
      assert.ok(Math.abs(paid - principal) < 1, `principal ${principal}/${months}: ${paid}`);
      assert.ok(rows[rows.length - 1].remaining < 1);
    }
  });

  it("pays no more interest than the contract total", () => {
    const rows = annuitySchedule(50_000_000, 10, 20);
    const interest = rows.reduce((sum, r) => sum + r.interestComponent, 0);
    assert.equal(interest, 4_489_920);
  });

  it("returns only the requested number of paid installments", () => {
    const rows = annuitySchedule(50_000_000, 10, 20, 3);
    assert.equal(rows.length, 3);
    assert.equal(rows[1].interestComponent, 1_765_424);
    assert.equal(rows[1].principalComponent, 959_072);
  });

  it("remaining principal never increases", () => {
    const rows = annuitySchedule(30_000_000, 10, 18);
    for (let i = 1; i < rows.length; i += 1) {
      assert.ok(rows[i].remaining <= rows[i - 1].remaining);
    }
  });
});
