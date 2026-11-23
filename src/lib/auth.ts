import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { assertLoginAllowed, clientIp, recordLoginAttempt } from "@/lib/loginLimiter";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  // NIP/NI anggota, atau email (Super Admin dan akun lama).
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1),
});

const SESSION_MAX_AGE = 12 * 60 * 60;
// Hash bcrypt tiruan untuk menyamakan waktu respons akun yang tidak ada.
const DUMMY_HASH = bcrypt.hashSync("tidak-dipakai", 10);

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  // Sesi berlaku 12 jam, bukan 30 hari bawaan.
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  jwt: { maxAge: SESSION_MAX_AGE },
  cookies: {
    sessionToken: {
      name: "praja-makmur.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "NIP/NI atau email dan kata sandi",
      credentials: {
        identifier: { label: "NIP/NI atau email", type: "text" },
        password: { label: "Kata sandi", type: "password" },
      },
      async authorize(credentials, req) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const identifier = parsed.data.identifier.toLowerCase();
        const ip = clientIp(req?.headers as Record<string, string | string[] | undefined>);
        // Terlalu banyak percobaan gagal: tolak sebelum memeriksa password.
        await assertLoginAllowed(identifier, ip);

        const user = identifier.includes("@")
          ? await prisma.user.findUnique({ where: { email: identifier } })
          : await prisma.user.findFirst({
              where: { member: { employeeNumber: parsed.data.identifier } },
            });

        // Bandingkan selalu (hash tiruan bila akun tidak ada) agar waktu respons
        // tidak membocorkan apakah NIP/email terdaftar.
        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user?.password ?? DUMMY_HASH,
        );
        if (!user?.isActive || !passwordMatches) {
          await recordLoginAttempt(identifier, ip, false);
          return null;
        }
        await recordLoginAttempt(identifier, ip, true);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
      } else {
        // Setiap permintaan: baca ulang status dan role dari database (satu
        // pencarian by primary key). Akun yang dinonaktifkan atau dihapus
        // langsung kehilangan akses, dan perubahan role langsung berlaku.
        // Melempar error membuat next-auth membersihkan sesi (dianggap keluar).
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: { isActive: true, role: true, mustChangePassword: true },
        });
        if (!fresh?.isActive) throw new Error("Akun tidak aktif.");
        token.role = fresh.role;
        token.mustChangePassword = fresh.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
};
