import { NextResponse } from "next/server";

export function proxy() {
  if (process.env.RAUMLY_PUBLIC_PILOT_MODE !== "true") return NextResponse.next();
  return new NextResponse("Nicht gefunden", {
    status: 404,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
  });
}

export const config = { matcher: ["/internal/:path*", "/api/internal/:path*"] };
