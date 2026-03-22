import { notFound } from "next/navigation"
import { readOrgIndex, readIntakeData } from "@/lib/intake/github"
import { WizardShell } from "@/components/intake/wizard-shell"
import schema from "@/data/ai-dossier-intake.json"
import type { FormSchema } from "@/lib/intake/schemas"

interface PageProps {
  params: Promise<{ orgId: string }>
}

export default async function IntakePage({ params }: PageProps) {
  const { orgId } = await params

  // Verify org exists in the index
  const orgIndex = await readOrgIndex()
  const orgEntry = orgIndex.find((org) => org.id === orgId)

  if (!orgEntry) {
    notFound()
  }

  // Load any previously saved data
  const savedData = await readIntakeData(orgId)

  return (
    <WizardShell
      schema={schema as FormSchema}
      initialData={savedData}
      orgId={orgId}
    />
  )
}
