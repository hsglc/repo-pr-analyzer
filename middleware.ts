import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/api/repos/:path*",
    "/api/analyze/:path*",
    "/api/settings/:path*",
    "/api/configs/:path*",
  ],
};
