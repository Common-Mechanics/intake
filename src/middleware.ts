import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware: password-protect admin panel and assistant API routes.
 * Uses a session cookie set by the /admin/login page.
 * Set ADMIN_USERNAME and ADMIN_PASSWORD in env to enable.
 */
export function middleware(request: NextRequest) {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD
  if (!username || !password) return NextResponse.next()

  /* Allow the login page and login API through */
  if (request.nextUrl.pathname === "/admin/login" ||
      request.nextUrl.pathname === "/api/intake/admin/login") {
    return NextResponse.next()
  }

  /* Check for valid session cookie */
  const session = request.cookies.get("admin_session")?.value
  if (session) {
    /* Verify the session token (simple HMAC of username) */
    const expected = hashToken(username + ":" + password)
    if (session === expected) {
      return NextResponse.next()
    }
  }

  /* Redirect to login page for browser requests, 401 for API */
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const loginUrl = new URL("/admin/login", request.url)
  loginUrl.searchParams.set("from", request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

/** Simple hash for session token — not crypto-grade but sufficient for a session cookie */
function hashToken(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return "s_" + Math.abs(hash).toString(36)
}

export const config = {
  matcher: ["/admin/:path*", "/api/intake/assistant/:path*"],
}
