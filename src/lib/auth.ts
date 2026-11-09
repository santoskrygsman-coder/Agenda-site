import crypto from "crypto";
import { NextResponse } from "next/server";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseSchemaSynced } from "@/lib/db-sync";

export const NEXTAUTH_RESOLVED_SECRET =
  process.env.NEXTAUTH_SECRET ||
  "emile-lash-designer-prod-secret-key-2026-v1";

export function hashPassword(password: string, salt?: string): string {
  const usedSalt = salt || crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, usedSalt, 64).toString("hex");
  return `${usedSalt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, "hex");
  if (derivedBuf.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derivedBuf, keyBuf);
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais Administrativas",
      credentials: {
        username: { label: "Usuário ou E-mail", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        await ensureDatabaseSchemaSynced();

        const identifier = credentials.username.trim().toLowerCase();
        const rawPassword = credentials.password;
        const trimmedPassword = rawPassword.trim();
        const prodEmail = (
          process.env.ADMIN_PRODUCTION_EMAIL || "contato@emilelash.com.br"
        )
          .trim()
          .toLowerCase();
        const prodPassword = (
          process.env.ADMIN_PRODUCTION_PASSWORD || "Vksanttos12"
        ).trim();

        const user = await prisma.user
          .findFirst({
            where: {
              OR: [
                { username: { equals: identifier, mode: "insensitive" } },
                { email: { equals: identifier, mode: "insensitive" } },
              ],
            },
          })
          .catch(() => null);

        if (user) {
          const isValid =
            verifyPassword(rawPassword, user.passwordHash) ||
            verifyPassword(trimmedPassword, user.passwordHash) ||
            (trimmedPassword.length > 0 &&
              verifyPassword(
                trimmedPassword[0].toUpperCase() + trimmedPassword.slice(1),
                user.passwordHash
              ));
          if (isValid) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }
        }

        const matchesProdPassword =
          Boolean(prodPassword) &&
          (rawPassword === prodPassword ||
            trimmedPassword === prodPassword ||
            trimmedPassword.toLowerCase() === prodPassword.toLowerCase());

        if (
          (identifier === prodEmail ||
            identifier === "admin" ||
            identifier === "emile") &&
          matchesProdPassword
        ) {
          if (user) {
            const updatedHash = hashPassword(prodPassword);
            await prisma.user
              .update({
                where: { id: user.id },
                data: { passwordHash: updatedHash },
              })
              .catch(() => {});
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }
          return {
            id: "admin-production",
            name: "Emile Lash Designer",
            email: prodEmail,
            role: "ADMIN",
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "ADMIN";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { id?: string; role?: string }).role =
          (token.role as string) || "ADMIN";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: NEXTAUTH_RESOLVED_SECRET,
};

export async function getAdminSession() {
  return await getServerSession(authOptions);
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}
