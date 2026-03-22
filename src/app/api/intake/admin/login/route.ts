import { NextResponse } from "next/server"

/** Simple hash matching the middleware's hashToken */
function hashToken(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return "s_" + Math.abs(hash).toString(36)
}

export async function POST(request: Request) {
  const expectedUsername = process.env.ADMIN_USERNAME
  const expectedPassword = process.env.ADMIN_PASSWORD

  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 })
  }

  const body = await request.json()
  const { username, password } = body as { username: string; password: string }

  if (username === expectedUsername && password === expectedPassword) {
    const token = hashToken(expectedUsername + ":" + expectedPassword)
    const response = NextResponse.json({ success: true })
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      /* Session cookie — expires when browser closes, or 24h max */
      maxAge: 60 * 60 * 24,
    })
    return response
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
}
