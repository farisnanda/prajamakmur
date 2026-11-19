import { LandingView } from "@/components/landing/LandingView";
import { landingData } from "@/lib/landing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [row, news, savings, activeMembers] = await Promise.all([
    prisma.landingContent.findUnique({ where: { id: "default" } }),
    prisma.newsPost.findMany({
      where: { isPublished: true },
      orderBy: { eventDate: "desc" },
      take: 3,
    }),
    prisma.savingsSetting.findUnique({ where: { id: "default" } }),
    prisma.member.count({ where: { isActive: true } }),
  ]);

  return (
    <LandingView
      c={landingData(row?.content)}
      news={news}
      offer={{
        principal: savings?.principalAmount.toNumber() ?? 500_000,
        mandatoryPns: savings?.mandatoryPnsAmount.toNumber() ?? 300_000,
        mandatoryPppk: savings?.mandatoryPppkAmount.toNumber() ?? 200_000,
        activeMembers,
      }}
    />
  );
}
