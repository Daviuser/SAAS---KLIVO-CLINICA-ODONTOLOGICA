import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// IMPORTANTE: o login pede e-mail + senha + a organização é resolvida
// pelo e-mail (já que e-mail é único POR organização, não globalmente).
// Se, no futuro, um mesmo e-mail existir em duas clínicas diferentes,
// o fluxo de login precisará pedir explicitamente qual clínica (ou usar
// subdomínio por clínica) — deixamos isso como ponto de atenção da Fase 5.

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findFirst({
          where: { email: credentials.email, active: true },
          include: { role: true, organization: true },
        });

        if (!user) return null;

        const validPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!validPassword) return null;

        if (user.organization.status !== "active") return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          organizationId: user.organizationId,
          roleId: user.roleId,
          roleName: user.role.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.organizationId = (user as any).organizationId;
        token.roleId = (user as any).roleId;
        token.roleName = (user as any).roleName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).roleId = token.roleId;
        (session.user as any).roleName = token.roleName;
      }
      return session;
    },
  },
};
