import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    //
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;
        
        // Rotas públicas que não precisam de autenticação
        if (
          path.startsWith("/api/auth") ||
          (path === "/api/appointments" && req.method === "POST") ||
          (path === "/api/availability" && req.method === "GET") ||
          (path === "/api/services" && req.method === "GET") ||
          (path === "/api/gallery" && req.method === "GET") ||
          (path === "/api/settings" && req.method === "GET") ||
          (path === "/api/working-hours" && req.method === "GET")
        ) {
          return true;
        }

        // Se for rota de API (mutação) ou /admin, exige token
        if (path.startsWith("/api/") || path.startsWith("/admin")) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"]
};
