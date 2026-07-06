import { SavingsLedger } from "@/components/savings/SavingsLedger";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <SavingsLedger type="SUKARELA" filters={await searchParams} />;
}
