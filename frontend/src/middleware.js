import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(request) {
  const nextAuthToken = await getToken({ req: request });
  
  const userInfoCookie = request.cookies.get("userInfo");
  let cookieUserInfo = null;
  
  if (userInfoCookie?.value) {
    try {
      cookieUserInfo = JSON.parse(decodeURIComponent(userInfoCookie.value));
    } catch (e) {
      try {
        cookieUserInfo = JSON.parse(userInfoCookie.value);
      } catch (err) {
        cookieUserInfo = null;
      }
    }
  }

  const isAuthenticated = !!nextAuthToken || !!cookieUserInfo?.token;

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL(`/auth/login`, request.url));
  }

  return NextResponse.next();
}


// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    "/user/:path*",
    "/order/:path*",
    "/checkout/:path*",
    // "/auth/login/:path*",
  ],
};
