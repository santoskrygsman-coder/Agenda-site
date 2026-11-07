import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(_req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;

        // Rotas públicas permitidas para o fluxo da cliente
        if (
          path.startsWith("/api/auth") ||
          (path === "/api/services" && req.method === "GET") ||
          (path === "/api/availability" && req.method === "GET") ||
          (path === "/api/settings" && req.method === "GET") ||
          (path === "/api/working-hours" && req.method === "GET") ||
          (path === "/api/appointments" && req.method === "POST") ||
          (path.match(/^\/api\/appointments\/[^/]+\/receipt$/) &&
            req.method === "POST")
        ) {
          return true;
        }

        // Todas as rotas /admin e demais rotas de mutação / listagem exigem autenticação
        if (path.startsWith("/admin") || path.startsWith("/api/")) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
