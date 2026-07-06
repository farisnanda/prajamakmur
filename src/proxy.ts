import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName: "praja-makmur.session-token",
  });

  if (token) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  const basePath = request.nextUrl.basePath || "";
  const callbackPath =
    basePath && request.nextUrl.pathname.startsWith(basePath)
      ? request.nextUrl.pathname.slice(basePath.length) || "/dashboard"
      : request.nextUrl.pathname;
  loginUrl.searchParams.set("callbackUrl", callbackPath);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/anggota/:path*", "/simpanan/:path*"],
};
