import { timingSafeEqual } from "crypto";
import { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET environment variable is not set");
}

// ── Type augmentation ────────────────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      userId: string;
      role: Role;
    };
  }

  interface User {
    id: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: Role;
  }
}

// ── Auth options ─────────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const adminEmail    = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const adminPassword = process.env.ADMIN_PASSWORD;
        const inputEmail    = credentials.email.toLowerCase().trim();

        if (!adminEmail || !adminPassword) {
          throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables.");
        }

        if (inputEmail !== adminEmail) return null;

        // Timing-safe comparison to prevent timing-oracle attacks
        const a = Buffer.from(credentials.password);
        const b = Buffer.from(adminPassword);
        const passwordMatch =
          a.length === b.length && timingSafeEqual(a, b);
        if (!passwordMatch) return null;

        // Upsert so userId exists for all data associations
        const user = await prisma.user.upsert({
          where: { email: adminEmail },
          update: {},
          create: {
            email: adminEmail,
            name: "Admin",
            password: await bcrypt.hash(adminPassword, 10),
            role: "ADMIN",
          },
          select: { id: true, email: true, name: true, role: true },
        });

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.userId = token.userId;
      session.user.role = token.role;
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
