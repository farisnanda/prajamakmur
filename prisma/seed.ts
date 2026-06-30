import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim() || "admin@prajamakmur.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD?.trim() || crypto.randomUUID();
  const password = await bcrypt.hash(adminPassword, 10);

  await prisma.savingsSetting.upsert({
    where: { id: "default" },
    update: {
      principalAmount: 500000,
      mandatoryPnsAmount: 300000,
      mandatoryPppkAmount: 200000,
    },
    create: {
      id: "default",
      principalAmount: 500000,
      mandatoryPnsAmount: 300000,
      mandatoryPppkAmount: 200000,
    },
  });

  await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {},
    create: {
      name: "Administrator",
      email: adminEmail,
      password,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log("Admin berhasil dibuat");
  console.log(`Email    : ${adminEmail}`);
  console.log(`Password : ${adminPassword}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log("Password dibuat otomatis karena SEED_ADMIN_PASSWORD belum diisi.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
