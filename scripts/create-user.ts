import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

// Usage (PowerShell):
//   $env:NEW_USER_PASSWORD = "<password>"
//   npx tsx scripts/create-user.ts <email> "<Nama>" [ROLE]
// Creates the user, or resets password and reactivates it if the email exists.
// The password is read from the environment so it never appears in the command line.

async function main() {
  const [emailArg, name, roleArg = "SUPER_ADMIN"] = process.argv.slice(2);
  const password = process.env.NEW_USER_PASSWORD;

  if (!emailArg || !name || !password) {
    throw new Error(
      'Isi $env:NEW_USER_PASSWORD, lalu jalankan: npx tsx scripts/create-user.ts <email> "<Nama>" [ROLE]',
    );
  }
  if (password.length < 8) throw new Error("Password minimal 8 karakter.");
  if (!(roleArg in Role)) {
    throw new Error(`Role tidak dikenal. Pilihan: ${Object.keys(Role).join(", ")}`);
  }

  const email = emailArg.trim().toLowerCase();
  const role = roleArg as Role;
  const hash = await bcrypt.hash(password, 10);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, password: hash, role, isActive: true },
      create: { name, email, password: hash, role, isActive: true },
      select: { email: true, role: true },
    });
    console.log(`OK: ${user.email} (${user.role})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
