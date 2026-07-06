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

  const memberEmail = process.env.SEED_MEMBER_EMAIL?.trim().toLowerCase();
  const memberPassword = process.env.SEED_MEMBER_PASSWORD?.trim();
  const memberNumber = process.env.SEED_MEMBER_NUMBER?.trim();
  if (memberEmail && memberPassword && memberNumber) {
    const member = await prisma.member.findUnique({ where: { memberNumber } });
    if (member) {
      const memberPasswordHash = await bcrypt.hash(memberPassword, 10);
      await prisma.user.upsert({
        where: { email: memberEmail },
        update: { name: member.name, password: memberPasswordHash, role: Role.ANGGOTA, isActive: true, memberId: member.id },
        create: { name: member.name, email: memberEmail, password: memberPasswordHash, role: Role.ANGGOTA, isActive: true, memberId: member.id },
      });
      console.log(`Akun anggota ${member.memberNumber} berhasil disiapkan`);
      console.log(`Email    : ${memberEmail}`);
      console.log(`Password : ${memberPassword}`);
    } else {
      console.log(`Akun anggota dilewati: nomor ${memberNumber} belum ditemukan.`);
    }
  }

  const workflowPassword = process.env.SEED_WORKFLOW_PASSWORD?.trim();
  if (workflowPassword) {
    const workflowPasswordHash = await bcrypt.hash(workflowPassword, 10);
    const workflowUsers = [
      { name: "Bendahara Gaji", email: "bendahara@prajamakmur.local", role: Role.BENDAHARA },
      { name: "Ketua Koperasi", email: "ketua@prajamakmur.local", role: Role.KETUA_KOPERASI },
      { name: "Admin Koperasi", email: "admin.koperasi@prajamakmur.local", role: Role.ADMIN_KOPERASI },
    ];
    for (const workflowUser of workflowUsers) {
      await prisma.user.upsert({ where: { email: workflowUser.email }, update: { name: workflowUser.name, password: workflowPasswordHash, role: workflowUser.role, isActive: true }, create: { ...workflowUser, password: workflowPasswordHash, isActive: true } });
    }
    console.log("Akun workflow pinjaman berhasil disiapkan.");
  }

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
