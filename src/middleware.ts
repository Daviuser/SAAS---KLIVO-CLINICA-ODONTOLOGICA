import { withAuth } from "next-auth/middleware";

// Protege as rotas internas do sistema — exige sessão válida.
// /onboarding é PROPOSITALMENTE pública: é ali que a clínica e o
// primeiro usuário Admin são criados, antes de existir qualquer login.
// A checagem de PERMISSÃO específica (não só autenticação) acontece
// dentro de cada rota de API/página, via `authorization.ts`.
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/patients/:path*", "/agenda/:path*", "/financial/:path*", "/procedures/:path*", "/settings/:path*", "/print/:path*", "/reports/:path*", "/commissions/:path*"],
};
