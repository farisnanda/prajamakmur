import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  // NIP/NI anggota, atau email (Super Admin dan akun lama).
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
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
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const identifier = parsed.data.identifier;
        const user = identifier.includes("@")
          ? await prisma.user.findUnique({
              where: { email: identifier.toLowerCase() },
            })
          : await prisma.user.findFirst({
              where: { member: { employeeNumber: identifier } },
            });

        if (!user?.isActive) return null;

        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user.password,
        );
        if (!passwordMatches) return null;

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
      } else if (token.mustChangePassword) {
        // Selama wajib ganti password, baca ulang status agar token
        // terbebas begitu password diganti.
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: { mustChangePassword: true },
        });
        token.mustChangePassword = fresh?.mustChangePassword ?? false;
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
