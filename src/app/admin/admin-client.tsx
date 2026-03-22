"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Plus,
  Copy,
  ExternalLink,
  Download,
  ClipboardCheck,
  ChevronDown,
  Mic,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { OrgEntry, OrgStatus } from "@/lib/intake/schemas"

// --- Date formatting helpers ---

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th"
  const lastDigit = day % 10
  if (lastDigit === 1) return "st"
  if (lastDigit === 2) return "nd"
  if (lastDigit === 3) return "rd"
  return "th"
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const day = d.getDate()
  return `${day}${ordinalSuffix(day)} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// --- Slug helper ---

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 8)
}

// --- Status badge config ---

const STATUS_CONFIG: Record<
  OrgStatus,
  { label: string; variant: "outline" | "secondary" | "default" }
> = {
  not_started: { label: "Not Started", variant: "outline" },
  in_progress: { label: "In Progress", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
}

// --- Components ---

function StatusBadge({ status }: { status: OrgStatus }) {
  const config = STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

function OrgCard({ org, onDeleted }: { org: OrgEntry; onDeleted: (id: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (deleteConfirm !== org.name) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/intake/orgs?id=${org.id}&confirm=${encodeURIComponent(org.name)}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Delete failed")
      }
      toast.success(`Deleted ${org.name}`)
      onDeleted(org.id)
      setDeleteOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  /* Build URL client-side only to avoid SSR hydration mismatch */
  const intakeUrl = typeof window !== "undefined" ? `${window.location.origin}/${org.id}` : `/${org.id}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(intakeUrl)
      setCopied(true)
      toast.success("Link copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy link")
    }
  }

  async function downloadData() {
    try {
      const res = await fetch(`/api/intake/orgs/${org.id}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${org.id}-intake.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Download started")
    } catch {
      toast.error("Failed to download data")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{org.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs">{org.id}</span>
              <StatusBadge status={org.status} />
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            aria-label={`Delete ${org.name}`}
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Last modified</span>
          <span>{formatDate(org.lastModified)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span>
            {org.completedSteps} of {org.totalSteps} steps completed
          </span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" onClick={copyLink}>
          {copied ? (
            <ClipboardCheck aria-hidden="true" className="size-3.5" />
          ) : (
            <Copy aria-hidden="true" className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy Link"}
        </Button>
        <Button variant="outline" size="sm" onClick={downloadData}>
          <Download aria-hidden="true" className="size-3.5" />
          Download
        </Button>
        <Link href={`/${org.id}`} className="ml-auto">
          <Button size="sm">
            <ExternalLink aria-hidden="true" className="size-3.5" />
            Open
          </Button>
        </Link>
      </CardFooter>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteConfirm("") }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{org.name}</strong> and all its intake data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              To confirm, type the organization name: <strong>{org.name}</strong>
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={org.name}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirm !== org.name || deleting}
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              {deleting ? "Deleting\u2026" : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
      <h2 className="font-heading text-xl font-semibold">
        No organizations yet
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Create your first organization to generate an intake form link for
        your client.
      </p>
      <Button className="mt-6" onClick={onCreateClick}>
        <Plus className="size-4" />
        Create Organization
      </Button>
    </div>
  )
}

function CreateOrgDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (org: OrgEntry) => void
}) {
  const [name, setName] = useState("")
  const [prefix, setPrefix] = useState("")
  const [schemaId, setSchemaId] = useState("ai-dossier-intake")
  const [submitting, setSubmitting] = useState(false)
  const [createdOrg, setCreatedOrg] = useState<OrgEntry | null>(null)
  const [copiedNewLink, setCopiedNewLink] = useState(false)

  // Auto-slugify name into prefix
  useEffect(() => {
    setPrefix(slugify(name))
  }, [name])

  function reset() {
    setName("")
    setPrefix("")
    setSchemaId("ai-dossier-intake")
    setSubmitting(false)
    setCreatedOrg(null)
    setCopiedNewLink(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !prefix.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/intake/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), prefix, schemaId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create organization")
      }

      const org: OrgEntry = await res.json()
      setCreatedOrg(org)
      onCreated(org)
      toast.success(`Created ${org.name}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create organization"
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function copyNewLink() {
    if (!createdOrg) return
    const url = `${window.location.origin}/${createdOrg.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedNewLink(true)
      toast.success("Link copied to clipboard")
      setTimeout(() => setCopiedNewLink(false), 2000)
    } catch {
      toast.error("Failed to copy link")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {createdOrg ? (
          <>
            <DialogHeader>
              <DialogTitle>Organization Created</DialogTitle>
              <DialogDescription>
                Share this link with your client to begin the intake process.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5">Organization</Label>
                <p className="text-sm font-medium">{createdOrg.name}</p>
              </div>
              <div>
                <Label className="mb-1.5">Intake Link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    defaultValue={`/${createdOrg.id}`}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyNewLink}
                    aria-label="Copy intake link"
                  >
                    {copiedNewLink ? (
                      <ClipboardCheck aria-hidden="true" className="size-4" />
                    ) : (
                      <Copy aria-hidden="true" className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
              <DialogDescription>
                Set up a new client intake form. The URL prefix determines
                the link they receive.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  placeholder="e.g. AI Whistleblower\u2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-prefix">URL Prefix</Label>
                <Input
                  id="org-prefix"
                  placeholder="e.g. aiwi\u2026"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The final URL will be: /{prefix}-{"<random id>"}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-schema">Schema</Label>
                <Select
                  value={schemaId}
                  onValueChange={(v) => { if (v) setSchemaId(v) }}
                >
                  <SelectTrigger className="w-full" id="org-schema">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai-dossier-intake">
                      AI Dossier Intake
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating\u2026" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// --- Voice assistant prompt editor ---

function AssistantPromptEditor() {
  const [prompt, setPrompt] = useState("")
  const [sha, setSha] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/intake/assistant/prompt")
      .then((res) => res.json())
      .then((data) => {
        setPrompt(data.content ?? "")
        setSha(data.sha ?? null)
      })
      .catch(() => toast.error("Failed to load assistant prompt"))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/intake/assistant/prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: prompt, sha }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Save failed")
      setSha(data.sha)
      if (data.synced) {
        setLastSynced(data.syncedAt)
        toast.success("Prompt saved and synced to ElevenLabs")
      } else {
        toast.success("Prompt saved to GitHub")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save prompt")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic aria-hidden="true" className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Voice Assistant</CardTitle>
          </div>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`}
          />
        </div>
        <CardDescription>
          System prompt for the ElevenLabs Conversational AI agent
        </CardDescription>
      </CardHeader>
      {expanded && (
        <CardContent className="flex flex-col gap-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading prompt\u2026</p>
          ) : (
            <>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={20}
                className="font-mono text-xs resize-y"
                placeholder="System prompt for the voice assistant\u2026"
              />
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground">
                  {lastSynced
                    ? `Last synced: ${new Date(lastSynced).toLocaleString("en-GB")}`
                    : "Not yet synced to ElevenLabs"}
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="sm"
                >
                  {saving ? "Saving\u2026" : "Save & Sync"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// --- Main admin client ---

export function AdminClient({
  initialOrgs,
  initialError,
}: {
  initialOrgs: OrgEntry[]
  initialError: string | null
}) {
  const [orgs, setOrgs] = useState<OrgEntry[]>(initialOrgs)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Show server-side error as toast on mount
  useEffect(() => {
    if (initialError) {
      toast.error(initialError)
    }
  }, [initialError])

  function handleOrgCreated(org: OrgEntry) {
    setOrgs((prev) => [...prev, org])
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Intake Admin</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Create Organization
        </Button>
      </div>

      <Separator className="my-6" />

      {orgs.length === 0 ? (
        <EmptyState onCreateClick={() => setDialogOpen(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {orgs.map((org) => (
            <OrgCard key={org.id} org={org} onDeleted={(id) => setOrgs(prev => prev.filter(o => o.id !== id))} />
          ))}
        </div>
      )}

      <Separator className="my-6" />

      <AssistantPromptEditor />

      <CreateOrgDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleOrgCreated}
      />
    </>
  )
}
