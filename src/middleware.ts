import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { isClinicPathAllowed } from "@/lib/clinic-ui";

export default withAuth((request) => {
  if (!isClinicPathAllowed(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}, { pages: { signIn: "/login" } });

export const config = {
  matcher: ["/dashboard/:path*", "/patients/:path*", "/agenda/:path*", "/consultas/:path*", "/financial/:path*", "/procedures/:path*", "/settings/:path*", "/print/:path*", "/reports/:path*", "/commissions/:path*", "/atestados/:path*"],
};
