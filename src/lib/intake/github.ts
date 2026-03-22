import { logger } from "./logger"
import type { OrgEntry, SavedData } from "./schemas"

const API_BASE = "https://api.github.com"

function getConfig() {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  const branch = process.env.GITHUB_BRANCH || "main"
  if (!token || !repo) {
    throw new Error("Missing GITHUB_TOKEN or GITHUB_REPO env vars")
  }
  return { token, repo, branch }
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

// --- Custom errors ---

export class ConflictError extends Error {
  constructor(
    message: string,
    public currentData?: unknown
  ) {
    super(message)
    this.name = "ConflictError"
  }
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string
  ) {
    super(message)
    this.name = "GitHubApiError"
  }
}

// --- Low-level helpers ---

/**
 * Read a file from the GitHub repo.
 * Returns { content, sha } or null if file doesn't exist.
 */
export async function readFile(
  path: string
): Promise<{ content: string; sha: string } | null> {
  const { token, repo, branch } = getConfig()
  const url = `${API_BASE}/repos/${repo}/contents/${path}?ref=${branch}`

  const res = await fetch(url, { headers: headers(token) })

  if (res.status === 404) return null

  if (!res.ok) {
    const body = await res.text()
    logger.error("readFile", new Error("GitHub API error"), {
      path,
      status: res.status,
      body,
    })
    throw new GitHubApiError(
      `Failed to read ${path}: ${res.status}`,
      res.status,
      body
    )
  }

  const json = await res.json()
  // GitHub returns base64-encoded content
  const content = Buffer.from(json.content, "base64").toString("utf-8")
  return { content, sha: json.sha }
}

/**
 * Create or update a file in the GitHub repo.
 * If sha is provided, performs an update with optimistic locking.
 * Throws ConflictError if sha doesn't match (409).
 */
export async function writeFile(
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<{ sha: string }> {
  const { token, repo, branch } = getConfig()
  const url = `${API_BASE}/repos/${repo}/contents/${path}`

  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
  }
  if (sha) body.sha = sha

  const res = await fetch(url, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(body),
  })

  if (res.status === 409 || res.status === 422) {
    // SHA mismatch — someone else updated the file
    // Consume response body before throwing
    await res.text()
    logger.warn("writeFile", "Conflict detected, SHA mismatch", {
      path,
      status: res.status,
    })
    throw new ConflictError(
      `Conflict writing ${path}: file was modified by another request`,
    )
  }

  if (!res.ok) {
    const errorBody = await res.text()
    logger.error("writeFile", new Error("GitHub API error"), {
      path,
      status: res.status,
      body: errorBody,
    })
    throw new GitHubApiError(
      `Failed to write ${path}: ${res.status}`,
      res.status,
      errorBody
    )
  }

  const json = await res.json()
  return { sha: json.content.sha }
}

/**
 * Delete a file from the GitHub repo. Requires the file's current SHA.
 */
export async function deleteFile(
  path: string,
  message: string,
  sha: string
): Promise<void> {
  const { token, repo, branch } = getConfig()
  const url = `${API_BASE}/repos/${repo}/contents/${path}`

  const res = await fetch(url, {
    method: "DELETE",
    headers: headers(token),
    body: JSON.stringify({ message, sha, branch }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    logger.error("deleteFile", new Error("GitHub API error"), {
      path,
      status: res.status,
      body: errorBody,
    })
    throw new GitHubApiError(
      `Failed to delete ${path}: ${res.status}`,
      res.status,
      errorBody
    )
  }
}

/**
 * Check if a file exists in the repo.
 */
export async function fileExists(path: string): Promise<boolean> {
  const result = await readFile(path)
  return result !== null
}

/**
 * List contents of a directory in the repo.
 */
export async function listDirectory(
  path: string
): Promise<{ name: string; type: string; path: string }[]> {
  const { token, repo, branch } = getConfig()
  const url = `${API_BASE}/repos/${repo}/contents/${path}?ref=${branch}`

  const res = await fetch(url, { headers: headers(token) })

  if (res.status === 404) return []

  if (!res.ok) {
    const body = await res.text()
    logger.error("listDirectory", new Error("GitHub API error"), {
      path,
      status: res.status,
      body,
    })
    throw new GitHubApiError(
      `Failed to list ${path}: ${res.status}`,
      res.status,
      body
    )
  }

  const json = await res.json()
  if (!Array.isArray(json)) return [] // path is a file, not a directory
  return json.map((item: { name: string; type: string; path: string }) => ({
    name: item.name,
    type: item.type,
    path: item.path,
  }))
}

// --- High-level helpers ---

const INDEX_PATH = "clients/index.json"

/**
 * Read the org index from clients/index.json.
 */
export async function readOrgIndex(): Promise<OrgEntry[]> {
  const result = await readFile(INDEX_PATH)
  if (!result) return []
  try {
    return JSON.parse(result.content)
  } catch (err) {
    logger.error("readOrgIndex", err, { path: INDEX_PATH })
    return []
  }
}

/**
 * Write the org index to clients/index.json.
 * Reads current SHA first to avoid conflicts.
 */
export async function writeOrgIndex(entries: OrgEntry[]): Promise<void> {
  const current = await readFile(INDEX_PATH)
  const content = JSON.stringify(entries, null, 2)
  await writeFile(
    INDEX_PATH,
    content,
    "Update org index",
    current?.sha
  )
}

/**
 * Read intake data for an org.
 */
export async function readIntakeData(
  orgId: string
): Promise<(SavedData & { sha: string }) | null> {
  const path = `clients/${orgId}/intake.json`
  const result = await readFile(path)
  if (!result) return null
  try {
    const data = JSON.parse(result.content) as SavedData
    return { ...data, sha: result.sha }
  } catch (err) {
    logger.error("readIntakeData", err, { orgId, path })
    return null
  }
}

/**
 * Write intake data for an org with optimistic locking.
 * Uses the sha from the SavedData to detect conflicts.
 */
export async function writeIntakeData(
  orgId: string,
  data: SavedData
): Promise<SavedData> {
  const path = `clients/${orgId}/intake.json`
  // Strip sha from stored data — it's metadata, not part of the payload
  const { sha, ...dataWithoutSha } = data
  const content = JSON.stringify(dataWithoutSha, null, 2)

  const result = await writeFile(
    path,
    content,
    `Update intake data for ${orgId}`,
    sha
  )

  return { ...dataWithoutSha, sha: result.sha }
}
