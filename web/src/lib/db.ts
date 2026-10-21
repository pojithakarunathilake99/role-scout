import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export type JobStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn'
export type JobSource = 'linkedin' | 'indeed' | 'cvlibrary' | 'adzuna' | 'reed' | 'manual'

export interface Job {
  id: string
  source: JobSource
  url: string
  title: string
  company: string
  location?: string
  salary?: string
  description?: string
  notes?: string
  postedAt?: string
  match?: { score: number; reason: string; sponsorship: 'offered' | 'not offered' | 'not mentioned' }
  sponsor?: { level: 'exact' | 'possible' | 'agency' | 'none'; name?: string }
  tailored?: { cv: string; fit: string; strengths: string[]; gaps: string[]; keywords: string[]; changes: string[]; issues?: { line: string; problem: string }[]; at: string }
  status: JobStatus
  history: { status: JobStatus; at: string; by: 'manual' | 'gmail' }[]
  savedAt: string
  updatedAt: string
}

export type NewJob = Pick<Job, 'source' | 'url' | 'title' | 'company'> &
  Partial<Pick<Job, 'location' | 'salary' | 'description' | 'notes' | 'postedAt' | 'match' | 'sponsor'>>

interface AgentDB extends DBSchema {
  jobs: { key: string; value: Job; indexes: { url: string; status: JobStatus; savedAt: string } }
  settings: { key: string; value: unknown }
}

let dbp: Promise<IDBPDatabase<AgentDB>> | null = null
export const db = () =>
  (dbp ??= openDB<AgentDB>('job-agent', 1, {
    upgrade(d) {
      const jobs = d.createObjectStore('jobs', { keyPath: 'id' })
      jobs.createIndex('url', 'url', { unique: true })
      jobs.createIndex('status', 'status')
      jobs.createIndex('savedAt', 'savedAt')
      d.createObjectStore('settings')
    },
  }))

const now = () => new Date().toISOString()

// Tell the UI that jobs changed (agent/Discover/extension write directly to the DB)
const changed = () => { try { window.dispatchEvent(new Event('rs:jobs-changed')) } catch { /* no window */ } }

// Strip tracking params; keep only job identifiers (Indeed jk, LinkedIn currentJobId)
export function normalizeUrl(u: string): string {
  const x = new URL(u)
  const p = new URLSearchParams()
  for (const k of ['jk', 'currentJobId']) {
    const v = x.searchParams.get(k)
    if (v) p.set(k, v)
  }
  x.search = p.toString()
  x.hash = ''
  return x.toString()
}

export async function addJob(input: NewJob): Promise<{ job: Job; created: boolean }> {
  const d = await db()
  const url = normalizeUrl(input.url)
  const existing = await d.getFromIndex('jobs', 'url', url)
  if (existing) return { job: existing, created: false }
  const t = now()
  const job: Job = {
    ...input, url,
    id: crypto.randomUUID(),
    status: 'saved',
    history: [{ status: 'saved', at: t, by: 'manual' }],
    savedAt: t, updatedAt: t,
  }
  await d.add('jobs', job)
  changed()
  return { job, created: true }
}

export async function getJob(id: string) {
  return (await db()).get('jobs', id)
}

export async function listJobs(status?: JobStatus): Promise<Job[]> {
  const d = await db()
  const all = status ? await d.getAllFromIndex('jobs', 'status', status) : await d.getAll('jobs')
  return all.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function updateJob(id: string, patch: Partial<Omit<Job, 'id' | 'history' | 'status'>>) {
  const d = await db()
  const job = await d.get('jobs', id)
  if (!job) throw new Error(`Job ${id} not found`)
  const next: Job = { ...job, ...patch, id, updatedAt: now() }
  await d.put('jobs', next)
  changed()
  return next
}

export async function setStatus(id: string, status: JobStatus, by: 'manual' | 'gmail' = 'manual') {
  const d = await db()
  const job = await d.get('jobs', id)
  if (!job) throw new Error(`Job ${id} not found`)
  if (job.status === status) return job
  const t = now()
  const next: Job = { ...job, status, updatedAt: t, history: [...job.history, { status, at: t, by }] }
  await d.put('jobs', next)
  changed()
  return next
}

export async function deleteJob(id: string) {
  await (await db()).delete('jobs', id)
  changed()
}

// Settings; keys starting with "secret:" (e.g. API key) are never exported
export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('settings', key)) as T | undefined
}
export async function setSetting(key: string, value: unknown) {
  await (await db()).put('settings', value, key)
}

export interface Backup {
  app: 'job-agent'
  version: 1
  exportedAt: string
  jobs: Job[]
  settings: Record<string, unknown>
}

export async function exportAll(): Promise<Backup> {
  const d = await db()
  const keys = await d.getAllKeys('settings')
  const settings: Record<string, unknown> = {}
  for (const k of keys) if (!k.startsWith('secret:')) settings[k] = await d.get('settings', k)
  return { app: 'job-agent', version: 1, exportedAt: now(), jobs: await d.getAll('jobs'), settings }
}

// Merge import: same id overwrites; a different job with the same URL is skipped
export async function importAll(b: Backup): Promise<{ imported: number; skipped: number }> {
  if (b?.app !== 'job-agent' || b.version !== 1) throw new Error('Not a job-agent backup')
  const d = await db()
  const tx = d.transaction(['jobs', 'settings'], 'readwrite')
  let imported = 0, skipped = 0
  for (const j of b.jobs) {
    const clash = await tx.objectStore('jobs').index('url').get(j.url)
    if (clash && clash.id !== j.id) { skipped++; continue }
    await tx.objectStore('jobs').put(j)
    imported++
  }
  for (const [k, v] of Object.entries(b.settings ?? {}))
    if (!k.startsWith('secret:')) await tx.objectStore('settings').put(v, k)
  await tx.done
  changed()
  return { imported, skipped }
}
