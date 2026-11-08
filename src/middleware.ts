import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

function isPublicApiRoute(path: string, method: string): boolean {
  return (
    path.startsWith("/api/auth") ||
    (path === "/api/services" && method === "GET") ||
    (path === "/api/availability" && method === "GET") ||
    (path === "/api/settings" && method === "GET") ||
    (path === "/api/working-hours" && method === "GET") ||
    (path.startsWith("/api/upload/file/") && method === "GET") ||
    (path === "/api/appointments/lookup" && method === "GET") ||
    (path === "/api/notifications/subscribe" && method === "GET") ||
    (path === "/api/appointments" && method === "POST") ||
    (Boolean(path.match(/^\/api\/appointments\/[^/]+\/receipt$/)) &&
      method === "POST")
  );
}

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const path = req.nextUrl.pathname;

    if (
      path.startsWith("/api/") &&
      !isPublicApiRoute(path, req.method) &&
      !req.nextauth.token
    ) {
      return NextResponse.json(
        {
          error:
            "Sessão expirada ou não autorizada. Faça login novamente no painel da profissional.",
        },
        { status: 401 }
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;

        // Para rotas /api/*, deixamos a função middleware acima responder com JSON 401
        // em vez de redirecionar (307 -> 200 HTML /login), evitando falsos positivos no fetch().
        if (path.startsWith("/api/")) {
          return true;
        }

        // Todas as páginas /admin exigem autenticação e redirecionam para /login quando não autenticadas
        if (path.startsWith("/admin")) {
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
