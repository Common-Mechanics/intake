import { readOrgIndex } from "@/lib/intake/github"
import { AdminClient } from "./admin-client"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  let orgs: Awaited<ReturnType<typeof readOrgIndex>> = []
  let error: string | null = null

  try {
    orgs = await readOrgIndex()
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Failed to load organizations"
  }

  return <AdminClient initialOrgs={orgs} initialError={error} />
}
