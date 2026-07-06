import { SavingsLedger } from "@/components/savings/SavingsLedger";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <SavingsLedger filters={await searchParams} />;
}
