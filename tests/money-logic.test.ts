import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { clampPage, dateRange, PAGE_SIZE, pageWindow, parsePage } from "../src/lib/listing";
import { nextMemberNumbers } from "../src/lib/memberNumber";
import { planRebalance } from "../src/lib/loanRebalance";
import { recordPrincipalSavings } from "../src/lib/principalSavings";

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("nextMemberNumbers", () => {
  const db = (numbers: string[]) =>
    ({ member: { findMany: async () => numbers.map((memberNumber) => ({ memberNumber })) } }) as any;

  it("starts at PM-0001 with no members", async () => {
    assert.deepEqual(await nextMemberNumbers(db([]), 2), ["PM-0001", "PM-0002"]);
  });

  it("continues the existing sequence and keeps the zero padding", async () => {
    assert.deepEqual(await nextMemberNumbers(db(["PM-001", "PM-002"]), 2), ["PM-003", "PM-004"]);
  });

  it("continues from the highest number, not the count", async () => {
    assert.deepEqual(await nextMemberNumbers(db(["PM-0001", "PM-0010", "PM-0003"])), ["PM-0011"]);
  });

  it("follows the most common prefix", async () => {
    const numbers = ["A-1", "PM-0005", "PM-0006", "PM-0007"];
    assert.deepEqual(await nextMemberNumbers(db(numbers)), ["PM-0008"]);
  });

  it("skips numbers reserved by the same import", async () => {
    assert.deepEqual(await nextMemberNumbers(db(["PM-0001"]), 2, ["PM-0002"]), ["PM-0003", "PM-0004"]);
  });
});

describe("list helpers", () => {
  it("parses the page number defensively", () => {
    assert.equal(parsePage(undefined), 1);
    assert.equal(parsePage("0"), 1);
    assert.equal(parsePage("-4"), 1);
    assert.equal(parsePage("abc"), 1);
    assert.equal(parsePage("7"), 7);
    assert.equal(parsePage(["3", "9"]), 3);
  });

  it("clamps to the last page and windows rows", () => {
    assert.equal(clampPage(99, 51), 3);
    assert.equal(clampPage(5, 0), 1);
    assert.deepEqual(pageWindow(3), { skip: 2 * PAGE_SIZE, take: PAGE_SIZE });
  });

  it("builds an inclusive date range and ignores bad input", () => {
    assert.equal(dateRange("", ""), undefined);
    assert.equal(dateRange("2026-13", "x"), undefined);
    const range = dateRange("2026-01-01", "2026-01-31")!;
    assert.ok(range.gte && range.lte && range.lte > range.gte);
  });
});

describe("planRebalance", () => {
  const payment = (n: number, interest: number, principal: number) => ({
    id: `p${n}`,
    receiptNumber: `ANG-${n}`,
    installmentNumber: n,
    paymentDate: new Date(2026, n, 1),
    amount: new Prisma.Decimal(2_724_496),
    interestComponent: new Prisma.Decimal(interest),
    principalComponent: new Prisma.Decimal(principal),
  });
  const loan = (payments: ReturnType<typeof payment>[]) => ({
    id: "l1",
    loanNumber: "PJM-1",
    principalAmount: new Prisma.Decimal(50_000_000),
    tenureMonths: 20,
    monthlyPayment: new Prisma.Decimal(2_724_496),
    member: { name: "Budi" },
    payments,
  });
  const db = (loans: unknown[]) => ({ loan: { findMany: async () => loans } }) as any;

  it("moves interest to the first installments", async () => {
    // Old style: standard annuity split (interest spread over every month).
    const old = [payment(1, 416_667, 2_307_829), payment(2, 396_000, 2_328_496)];
    const plan = await planRebalance(db([loan(old)]));
    assert.equal(plan.changes.length, 2);
    assert.equal(plan.changes[0].newInterest, 2_724_496);
    assert.equal(plan.changes[0].newPrincipal, 0);
    assert.equal(plan.changes[1].newInterest, 1_765_424);
    assert.equal(plan.changes[1].newPrincipal, 959_072);
    assert.equal(plan.loanCount, 1);
  });

  it("is idempotent: already-correct payments produce no changes", async () => {
    const good = [payment(1, 2_724_496, 0), payment(2, 1_765_424, 959_072), payment(3, 0, 2_724_496)];
    const plan = await planRebalance(db([loan(good)]));
    assert.equal(plan.changes.length, 0);
  });

  it("keeps amount = interest + principal for every changed payment", async () => {
    const plan = await planRebalance(db([loan([payment(1, 100_000, 2_624_496)])]));
    for (const change of plan.changes) {
      assert.ok(Math.abs(change.newInterest + change.newPrincipal - change.amount) < 0.01);
    }
  });
});

describe("recordPrincipalSavings", () => {
  function fakeTx(options: { paid: string[]; setting?: number; hasCash?: boolean }) {
    const calls: Record<string, any[]> = { savings: [], cash: [], book: [], balance: [] };
    const tx = {
      savingsTransaction: {
        findMany: async () => options.paid.map((memberId) => ({ memberId })),
        createMany: async ({ data }: any) => void calls.savings.push(...data),
      },
      savingsSetting: {
        findUnique: async () =>
          options.setting ? { principalAmount: new Prisma.Decimal(options.setting) } : null,
      },
      cashAccount: {
        findUnique: async () => (options.hasCash === false ? null : { id: "cash1", name: "Kas Bank" }),
        update: async ({ data }: any) => void calls.balance.push(data.balance.increment),
      },
      cashTransaction: { createMany: async ({ data }: any) => void calls.cash.push(...data) },
      bookkeepingEntry: { createMany: async ({ data }: any) => void calls.book.push(...data) },
    } as any;
    return { tx, calls };
  }
  const members = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "c", name: "C" },
  ];

  it("records one deposit, cash row and journal row per new member", async () => {
    const { tx, calls } = fakeTx({ paid: [] });
    const result = await recordPrincipalSavings(tx, { members, createdById: "u1" });
    assert.deepEqual(result, { count: 3, total: 1_500_000 });
    assert.equal(calls.savings.length, 3);
    assert.equal(calls.cash.length, 3);
    assert.equal(calls.book.length, 3);
    assert.deepEqual(calls.balance, [1_500_000]);
  });

  it("skips members that already paid, so it is safe to repeat", async () => {
    const { tx, calls } = fakeTx({ paid: ["a", "c"] });
    const result = await recordPrincipalSavings(tx, { members, createdById: "u1" });
    assert.equal(result.count, 1);
    assert.equal(calls.savings[0].memberId, "b");
    assert.deepEqual(calls.balance, [500_000]);
  });

  it("uses the configured amount", async () => {
    const { tx } = fakeTx({ paid: [], setting: 750_000 });
    const result = await recordPrincipalSavings(tx, { members: [members[0]], createdById: "u1" });
    assert.equal(result.total, 750_000);
  });

  it("does nothing when everyone already paid", async () => {
    const { tx, calls } = fakeTx({ paid: ["a", "b", "c"] });
    assert.deepEqual(await recordPrincipalSavings(tx, { members, createdById: "u1" }), { count: 0, total: 0 });
    assert.equal(calls.balance.length, 0);
  });

  it("fails loudly when the cash account is missing", async () => {
    const { tx } = fakeTx({ paid: [], hasCash: false });
    await assert.rejects(recordPrincipalSavings(tx, { members, createdById: "u1" }), /kas/i);
  });
});
