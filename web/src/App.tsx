import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from 'react'
import './App.css'
import { addJob, deleteJob, exportAll, getSetting, importAll, listJobs, setSetting, setStatus, updateJob, type Backup, type Job, type JobSource, type JobStatus, type NewJob } from './lib/db'
import { generateJSON, getLLMConfig, PROVIDER_DEFAULTS, type Provider } from './lib/llm'
import { extractCvText, extractProfile } from './lib/cv'
import DiscoverPage from './DiscoverPage'
import HelpPage from './HelpPage'
import { FEEDBACK_URL } from './Welcome'
import AgentPage from './AgentPage'
import TailorPage from './TailorPage'

type Route = { page: 'dashboard' | 'discover' | 'profile' | 'settings' | 'job' | 'help' | 'agent' | 'tailor'; id?: string }
type Profile = {
  name: string
  targetTitles: string
  skills: string
  locations: string
  visaSponsorship: boolean
  cvText: string
  cvFileName: string
  cvFileData: string
}
type ThemeSetting = { theme: 'light' | 'dark' }
type ModalState = 'add' | 'delete' | null

const statuses: JobStatus[] = ['saved', 'applied', 'interview', 'offer', 'rejected', 'withdrawn']
const blankProfile: Profile = { name: '', targetTitles: '', skills: '', locations: '', visaSponsorship: false, cvText: '', cvFileName: '', cvFileData: '' }
const emptyStatusCounts: Record<JobStatus, number> = { saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0, withdrawn: 0 }

function readRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '')
  if (raw.startsWith('job/')) return { page: 'job', id: decodeURIComponent(raw.slice(4)) }
  if (raw.startsWith('tailor/')) return { page: 'tailor', id: decodeURIComponent(raw.slice(7)) }
  if (raw === 'dashboard' || raw === 'profile' || raw === 'settings' || raw === 'help' || raw === 'agent') return { page: raw }
  return { page: 'discover' }
}

function go(path: string) {
  const hash = `#/${path}`
  if (window.location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'))
  else window.location.hash = hash
}

function Icon({ name, size = 17 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    settings: <><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.4 15 .1.1 1.1 1.9-2 3.4-2.2-.1-.2-.2-2.2.9-.2.2h-3.9l-.9-2-2.1-.9-.2.1-2 .1-2-3.4L4 13l.1-.2V11l-.1-.2L3 8.9l2-3.4 2.2.1.2.2 2.2-.9.2-.2h3.9l.9 2 2.1.9.2-.1 2-.1 2 3.4-1.1 1.9-.1.2Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    moon: <path d="M20.8 14.3A8.5 8.5 0 0 1 9.7 3.2 8.5 8.5 0 1 0 20.8 14.3Z" />,
    list: <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    board: <><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="11" rx="1" /><rect x="17" y="4" width="4" height="7" rx="1" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    back: <><path d="m15 18-6-6 6-6" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M5 17v4h14v-4" /></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M5 17v4h14v-4" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8m-8 4h8" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><path d="M12 3 2.7 19a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L12 3Z" /><path d="M12 9v4m0 4h.01" /></>,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2" /></>,
  }
  return <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.sparkle}</svg>
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map(word => word[0]?.toUpperCase() ?? '').join('') || '—'
}

function sponsorSignal(job: Job): 'sponsor' | 'possible' | null {
  if (job.match?.sponsorship === 'not offered') return null
  if (job.sponsor?.level === 'exact') return 'sponsor'
  if (job.sponsor?.level === 'possible') return 'possible'
  const text = `${job.title} ${job.company} ${job.location ?? ''} ${job.description ?? ''}`.toLowerCase()
  if (/does not (offer|provide|sponsor)|unable to sponsor|cannot sponsor|will not (sponsor|provide sponsorship)|no (visa )?sponsorship available|no visa sponsorship|sponsorship is not available/.test(text)) return null
  if (/visa sponsorship available|sponsorship available|sponsor(s|ed|ing)? (a )?(visa|visas|work permit)|visa(s)? (are )?sponsor(ed|ship)|h-?1b sponsorship|skilled worker visa sponsorship/.test(text)) return 'sponsor'
  if (/\bvisa\b|\bsponsorship\b|\bimmigration support\b|\bwork permit\b|\binternational candidates\b/.test(text)) return 'possible'
  return null
}

function terms(value: string) {
  return value.toLowerCase().split(/[,;\n|]+/).map(item => item.trim()).filter(Boolean)
}

function matchScore(job: Job, profile: Profile): number | null {
  if (job.match) return job.match.score
  const skillTerms = terms(profile.skills)
  const titleTerms = terms(profile.targetTitles)
  const locationTerms = terms(profile.locations)
  const haystack = `${job.title} ${job.company} ${job.location ?? ''} ${job.description ?? ''}`.toLowerCase()
  const groups = [
    { list: skillTerms, weight: 55 },
    { list: titleTerms, weight: 30 },
    { list: locationTerms, weight: 15 },
  ].filter(group => group.list.length)
  if (!groups.length) return 0
  const activeWeight = groups.reduce((sum, group) => sum + group.weight, 0)
  const points = groups.reduce((sum, group) => {
    const hits = group.list.filter(item => haystack.includes(item)).length
    return sum + (hits / group.list.length) * group.weight
  }, 0)
  return Math.round((points / activeWeight) * 100)
}

function App() {
  const [route, setRoute] = useState<Route>(readRoute)
  const [jobs, setJobs] = useState<Job[]>([])
  // Reload the job list whenever the DB changes or the page changes
  useEffect(() => {
    const reload = () => { void listJobs().then(setJobs).catch(() => {}) }
    window.addEventListener('rs:jobs-changed', reload)
    window.addEventListener('hashchange', reload)
    return () => {
      window.removeEventListener('rs:jobs-changed', reload)
      window.removeEventListener('hashchange', reload)
    }
  }, [])
  // Show AI provider switch / limit messages as toasts
  useEffect(() => {
    const onNotice = (e: Event) => notify((e as CustomEvent<string>).detail)
    window.addEventListener('rs:notice', onNotice)
    return () => window.removeEventListener('rs:notice', onNotice)
  }, [])
  const [profile, setProfile] = useState<Profile>(blankProfile)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sponsorFilter, setSponsorFilter] = useState('')
  const [view, setView] = useState<'list' | 'board'>('list')
  const [dragOver, setDragOver] = useState<JobStatus | null>(null)
  const [notesEditor, setNotesEditor] = useState({ jobId: '', value: '' })
  const [savingNotes, setSavingNotes] = useState(false)
  const [secrets, setSecrets] = useState({ gemini: '', groq: '', reed: '', adzuna: '', adzunaId: '' })
  const [models, setModels] = useState<{ provider: Provider; scoringModel: string; writingModel: string }>({ provider: 'gemini', scoringModel: 'gemini-3.5-flash-lite', writingModel: 'gemini-3.5-flash-lite' })
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')
  const [geminiResult, setGeminiResult] = useState('')
  const [importSummary, setImportSummary] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [fillingFromCv, setFillingFromCv] = useState(false)
  const cvInput = useRef<HTMLInputElement>(null)
  const backupInput = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notify = (message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3200)
  }

  const refreshJobs = async () => {
    setLoadError('')
    try {
      setJobs(await listJobs())
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Your local job list could not be opened.')
    }
  }

  useEffect(() => {
    const syncRoute = () => setRoute(readRoute())
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    let active = true
    async function initialize() {
      try {
        const [allJobs, savedProfile, savedTheme, gemini, reed, adzuna, adzunaId, groq] = await Promise.all([
          listJobs(),
          getSetting<Profile>('profile'),
          getSetting<ThemeSetting>('preferences'),
          getSetting<string>('secret:gemini'),
          getSetting<string>('secret:reed'),
          getSetting<string>('secret:adzuna'),
          getSetting<string>('secret:adzunaId'),
          getSetting<string>('secret:groq'),
        ])
        if (!active) return
        setJobs(allJobs)
        setProfile({ ...blankProfile, ...(savedProfile ?? {}) })
        const mode = savedTheme?.theme === 'dark' ? 'dark' : 'light'
        setTheme(mode)
        document.documentElement.dataset.theme = mode
        setSecrets({ gemini: gemini ?? '', reed: reed ?? '', adzuna: adzuna ?? '', adzunaId: adzunaId ?? '', groq: groq ?? '' })
        try {
          const config = await getLLMConfig()
          if (active && config) setModels({ provider: config.provider, scoringModel: config.scoringModel, writingModel: config.writingModel })
        } catch {
          // Settings remain editable even before an API key or helper configuration exists.
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Your local workspace could not be opened.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void initialize()
    return () => { active = false }
  }, [])

  const activeJob = route.page === 'job' ? jobs.find(job => job.id === route.id) : undefined
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  const noteDraft = activeJob ? (notesEditor.jobId === activeJob.id ? notesEditor.value : activeJob.notes ?? '') : ''

  const counts = useMemo(() => jobs.reduce((all, job) => ({ ...all, [job.status]: all[job.status] + 1 }), { ...emptyStatusCounts }), [jobs])
  const visibleJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return jobs.filter(job => {
      const textMatch = !normalizedQuery || `${job.title} ${job.company} ${job.location ?? ''} ${job.description ?? ''}`.toLowerCase().includes(normalizedQuery)
      const statusMatch = !statusFilter || job.status === statusFilter
      const hasSponsor = sponsorSignal(job) !== null
      const sponsorMatch = !sponsorFilter || hasSponsor
      return textMatch && statusMatch && sponsorMatch
    })
  }, [jobs, query, statusFilter, sponsorFilter])

  async function handleAddJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input: NewJob = {
      source: (form.get('source') as JobSource) || 'manual',
      url: String(form.get('url') ?? '').trim(),
      title: String(form.get('title') ?? '').trim(),
      company: String(form.get('company') ?? '').trim(),
      location: String(form.get('location') ?? '').trim() || undefined,
      salary: String(form.get('salary') ?? '').trim() || undefined,
      description: String(form.get('description') ?? '').trim() || undefined,
      notes: String(form.get('notes') ?? '').trim() || undefined,
    }
    try {
      const result = await addJob(input)
      await refreshJobs()
      setModal(null)
      if (result.created) {
        notify('Opportunity saved to your workspace.')
        go(`job/${encodeURIComponent(result.job.id)}`)
      } else {
        notify('That job URL is already saved.')
        go(`job/${encodeURIComponent(result.job.id)}`)
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The job could not be saved.')
    }
  }

  async function changeJobStatus(job: Job, status: JobStatus) {
    try {
      await setStatus(job.id, status, 'manual')
      await refreshJobs()
      notify(`Moved to ${status}.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Status could not be updated.')
    }
  }

  async function saveNotes() {
    if (!activeJob) return
    setSavingNotes(true)
    try {
      const updated = await updateJob(activeJob.id, { notes: noteDraft })
      setJobs(current => current.map(job => job.id === updated.id ? updated : job))
      notify('Notes saved.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Notes could not be saved.')
    } finally {
      setSavingNotes(false)
    }
  }

  async function confirmDelete() {
    if (!activeJob) return
    try {
      await deleteJob(activeJob.id)
      setJobs(current => current.filter(job => job.id !== activeJob.id))
      setModal(null)
      notify('Opportunity deleted.')
      go('dashboard')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The job could not be deleted.')
    }
  }

  async function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    try { await setSetting('preferences', { theme: next } satisfies ThemeSetting) } catch { notify('Theme changed, but the preference could not be saved.') }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingProfile(true)
    try {
      await setSetting('profile', profile)
      notify('Profile saved on this device.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Profile could not be saved.')
    } finally { setSavingProfile(false) }
  }

  async function handleCvUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      notify('Reading CV…')
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
        reader.onerror = () => reject(new Error('This file could not be read.'))
        reader.readAsDataURL(file)
      })
      const text = await extractCvText(file)
      setProfile(current => ({ ...current, cvFileName: file.name, cvFileData: fileData, cvText: text }))
      notify('CV text extracted. Click "Fill from CV with AI", then save your profile.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'This file could not be read.')
    }
  }

  async function fillFromCv() {
    if (!profile.cvText.trim()) { notify('Upload or paste your CV first.'); return }
    setFillingFromCv(true)
    try {
      const p = await extractProfile(profile.cvText)
      setProfile(current => ({
        ...current,
        name: p.name || current.name,
        targetTitles: p.targetTitles.join(', ') || current.targetTitles,
        skills: p.skills.join(', ') || current.skills,
        locations: p.locations.join(', ') || current.locations,
      }))
      notify('Profile filled from your CV. Review it, then save.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not read your profile from the CV.')
    } finally { setFillingFromCv(false) }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSettingsBusy(true)
    setSettingsMessage('')
    try {
      await Promise.all([
        setSetting('secret:gemini', secrets.gemini),
        setSetting('secret:groq', secrets.groq),
        setSetting('secret:reed', secrets.reed),
        setSetting('secret:adzuna', secrets.adzuna),
        setSetting('secret:adzunaId', secrets.adzunaId),
        setSetting('llm', models),
      ])
      setSettingsMessage('Settings saved locally. API keys are excluded from backups.')
      notify('Settings saved.')
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : 'Settings could not be saved.')
    } finally { setSettingsBusy(false) }
  }

  async function testGemini() {
    setSettingsBusy(true)
    setGeminiResult('')
    try {
      await Promise.all([
        setSetting('secret:gemini', secrets.gemini),
        setSetting('secret:groq', secrets.groq),
        setSetting('llm', models),
      ])
      const result = await generateJSON<{ ok: boolean; message: string }>({ task: 'scoring', prompt: 'Return a JSON object with keys ok (boolean) and message (string). Set ok to true and message to "Connection succeeded".' })
      setGeminiResult(result.message || JSON.stringify(result))
    } catch (error) {
      setGeminiResult(error instanceof Error ? error.message : 'Gemini test failed. Check your key and model.')
    } finally { setSettingsBusy(false) }
  }

  async function downloadBackup() {
    try {
      const backup = await exportAll()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `rolescout-backup-${backup.exportedAt.slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      notify('Backup exported.')
    } catch (error) { notify(error instanceof Error ? error.message : 'Backup could not be exported.') }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const backup = JSON.parse(await file.text()) as Backup
      const result = await importAll(backup)
      await refreshJobs()
      const [savedProfile, savedPreferences, savedModels] = await Promise.all([
        getSetting<Profile>('profile'),
        getSetting<ThemeSetting>('preferences'),
        getLLMConfig(),
      ])
      if (savedProfile) setProfile({ ...blankProfile, ...savedProfile })
      if (savedPreferences?.theme) {
        setTheme(savedPreferences.theme)
      }
      setModels(savedModels)
      setImportSummary(`${result.imported} record${result.imported === 1 ? '' : 's'} imported; ${result.skipped} skipped because their URL already exists.`)
      notify('Backup merged into this workspace.')
    } catch (error) {
      setImportSummary(error instanceof Error ? error.message : 'That file is not a valid RoleScout backup.')
    } finally { event.target.value = '' }
  }

  async function dropOn(status: JobStatus, event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setDragOver(null)
    const id = event.dataTransfer.getData('text/job-id')
    const job = jobs.find(item => item.id === id)
    if (job && job.status !== status) await changeJobStatus(job, status)
  }

  const navigation = [
    { page: 'discover', label: 'Discover', icon: 'search' },
    { page: 'agent', label: 'Agent', icon: 'shield' },
    { page: 'dashboard', label: 'Workspace', icon: 'grid' },
    { page: 'profile', label: 'Profile', icon: 'user' },
    { page: 'settings', label: 'Settings', icon: 'settings' },
    { page: 'help', label: 'How to use', icon: 'check' },
  ] as const

  function NavContent() {
    return <div className="nav-list">{navigation.map(item => <button key={item.page} className={`nav-item ${route.page === item.page || (item.page === 'dashboard' && route.page === 'job') ? 'active' : ''}`} onClick={() => go(item.page)}><Icon name={item.icon} /><span>{item.label}</span></button>)}</div>
  }

  function JobCard({ job, board = false }: { job: Job; board?: boolean }) {
    const score = matchScore(job, profile)
    return board ? <article className="kanban-card" draggable onDragStart={event => event.dataTransfer.setData('text/job-id', job.id)}>
      <button className="job-title" onClick={() => go(`job/${encodeURIComponent(job.id)}`)}>{job.title}</button>
      <div className="company-name">{job.company}</div>
      <div className="kanban-card-bottom">
        <span className="match">{score}% match</span>
        {sponsorSignal(job) && <span className={`badge sponsor ${sponsorSignal(job) === 'possible' ? 'possible-sponsor' : ''}`}>{sponsorSignal(job) === 'sponsor' ? 'Sponsor' : 'Possible sponsor'}</span>}
      </div>
    </article> : <article className="job-row reveal">
      <div className="job-main">
        <div className="company-mark">{initials(job.company)}</div>
        <div style={{ minWidth: 0 }}>
          <button className="job-title" onClick={() => go(`job/${encodeURIComponent(job.id)}`)} title={job.title}>{job.title}</button>
          <div className="company-name">{job.company}<span className="source-tag"> · {job.source}</span></div>
        </div>
      </div>
      <div className="row-location"><span className="row-label">Location</span><span className="row-value">{job.location || 'Not specified'}</span></div>
      <div className="row-salary"><span className="row-label">Compensation</span><span className="row-value">{job.salary || 'Not listed'}</span></div>
      <div className="job-match"><span className="match"><span className="match-track"><span className="match-fill" style={{ width: `${score}%` }} /></span>{score}%</span></div>
      <div className="row-actions">
        {sponsorSignal(job) && <span className={`badge sponsor ${sponsorSignal(job) === 'possible' ? 'possible-sponsor' : ''}`} title="Based on visa-related keywords in the saved job details"><Icon name="shield" size={12} />{sponsorSignal(job) === 'sponsor' ? 'Sponsor' : 'Possible sponsor'}</span>}
        <span className={`badge status-${job.status}`}>{job.status}</span>
        <select aria-label={`Update status for ${job.title}`} value={job.status} onChange={event => void changeJobStatus(job, event.target.value as JobStatus)}>
          {statuses.map(status => <option value={status} key={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
        </select>
      </div>
    </article>
  }

  function Dashboard() {
    return <>
      <div className="page-heading">
        <div><div className="eyebrow">Your next move, in view</div><h1>Good work, in progress.</h1><p className="subtitle">One calm place to keep every opportunity moving.</p></div>
        <button className="button primary" onClick={() => setModal('add')}><Icon name="plus" size={15} />Add job</button>
      </div>
      <section className="metric-strip" aria-label="Job search overview">
        {[['Opportunities', jobs.length, 'all'], ['In progress', counts.applied + counts.interview, 'active'], ['Interviews', counts.interview, 'interview'], ['Offers', counts.offer, 'offer']].map(([label, value, key]) => <div className="metric reveal" key={key}><div className="metric-top"><span>{label}</span><span className="metric-marker" /></div><div className="metric-number">{value}</div></div>)}
      </section>
      <div className="toolbar">
        <div className="search-wrap"><Icon name="search" size={16} /><input aria-label="Search saved jobs" placeholder="Search title, company, description…" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <select className="filter-select" aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All statuses</option>{statuses.map(status => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select>
        <button className={`sponsor-filter ${sponsorFilter ? 'active' : ''}`} type="button" aria-pressed={Boolean(sponsorFilter)} onClick={() => setSponsorFilter(current => current ? '' : 'yes')}><Icon name="shield" size={13} />Sponsor only</button>
        <div className="view-toggle"><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view"><Icon name="list" size={14} />List</button><button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')} aria-label="Kanban board view"><Icon name="board" size={14} />Board</button></div>
      </div>
      <div className="results-meta"><span>{visibleJobs.length} {visibleJobs.length === 1 ? 'opportunity' : 'opportunities'}</span><span>{view === 'board' ? 'Drag a card to change its status' : 'Status updates are saved instantly'}</span></div>
      {loading ? <div className="job-list">{[0, 1, 2, 3].map(index => <div className="job-row" key={index} aria-hidden="true"><div className="job-main"><div className="company-mark" /><div style={{ width: '68%' }}><div style={{ height: 12, background: 'var(--surface-2)', borderRadius: 4, marginBottom: 9 }} /><div style={{ height: 9, background: 'var(--surface-2)', borderRadius: 4, width: '58%' }} /></div></div></div>)}</div>
        : loadError ? <div className="empty-state"><div className="empty-mark"><Icon name="alert" /></div><h3>Workspace unavailable</h3><p>{loadError}</p><button className="button" onClick={() => void refreshJobs()}>Try again</button></div>
        : view === 'list' ? visibleJobs.length ? <div className="job-list">{visibleJobs.map(job => <div key={job.id}>{JobCard({ job })}</div>)}</div> : EmptyDashboard({ filtered: Boolean(query || statusFilter || sponsorFilter), onAdd: () => setModal('add') })
        : <div className="kanban">{statuses.map(status => {
          const cards = visibleJobs.filter(job => job.status === status)
          return <section key={status} className={`kanban-column ${dragOver === status ? 'drag-over' : ''}`} onDragOver={event => { event.preventDefault(); setDragOver(status) }} onDragLeave={() => setDragOver(null)} onDrop={event => void dropOn(status, event)}>
            <div className="column-head"><span>{status[0].toUpperCase() + status.slice(1)}</span><span className="column-count">{cards.length.toString().padStart(2, '0')}</span></div>
            {cards.map(job => <div key={job.id}>{JobCard({ job, board: true })}</div>)}
          </section>
        })}</div>}
      {Footer()}
    </>
  }

  function EmptyDashboard({ filtered, onAdd }: { filtered: boolean; onAdd: () => void }) {
    return <div className="empty-state"><div className="empty-mark"><Icon name={filtered ? 'search' : 'file'} /></div><h3>{filtered ? 'Nothing in this view' : 'Your search starts here'}</h3><p>{filtered ? 'Try a wider search or clear one of the filters.' : 'Save the opportunities you want to pursue. Your list stays on this device.'}</p>{!filtered && <button className="button primary" onClick={onAdd}><Icon name="plus" size={15} />Add your first job</button>}</div>
  }

  function Detail() {
    if (!activeJob) return <div className="empty-state"><div className="empty-mark"><Icon name="file" /></div><h3>Opportunity not found</h3><p>This record may have been removed from your local workspace.</p><button className="button" onClick={() => go('dashboard')}>Back to workspace</button></div>
    const job = activeJob
    const score = matchScore(job, profile)
    return <>
      <button className="detail-back" onClick={() => go('dashboard')}><Icon name="back" size={15} />Back to workspace</button>
      <div className="detail-heading">
        <div><div className="eyebrow">Opportunity file / {job.source}</div><h1>{job.title}</h1><div className="detail-company">{job.company} · {job.location || 'Location not specified'}</div></div>
        <div className="row-actions"><select aria-label="Update job status" value={job.status} onChange={event => void changeJobStatus(job, event.target.value as JobStatus)}>{statuses.map(status => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select><a className="button small" href={job.url} target="_blank" rel="noreferrer"><Icon name="arrow" size={13} />Open job</a><button className="icon-btn" aria-label="Delete job" onClick={() => setModal('delete')}><Icon name="trash" size={15} /></button></div>
      </div>
      <div className="detail-grid">
        <div>
          <section className="panel">
            <div className="panel-head"><h2>Role description</h2><span className="panel-caption">From your saved listing</span></div>
            {job.description ? <div className="description-text">{job.description}</div> : <p className="subtitle">No description has been added to this opportunity yet.</p>}
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Working notes</h2><button className="button small" onClick={() => void saveNotes()} disabled={savingNotes}>{savingNotes ? 'Saving…' : 'Save notes'}</button></div>
            <textarea className="notes-area" value={noteDraft} onChange={event => setNotesEditor({ jobId: job.id, value: event.target.value })} placeholder="What stands out? Add a person to contact, a question for the interview, or a reason this role matters." aria-label="Job notes" />
            <div className="save-hint">Notes are stored only in this browser.</div>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Application history</h2><span className="panel-caption">{job.history.length} updates</span></div>
            <div className="timeline">{[...job.history].reverse().map((item, index) => <div className="timeline-item" key={`${item.at}-${index}`}><span className="timeline-dot" /><div><div className="timeline-label">{item.status}{item.by === 'gmail' ? ' · email sync' : ''}</div><div className="timeline-date">{new Date(item.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div></div></div>)}</div>
          </section>
        </div>
        <aside>
          <section className="panel">
            <div className="panel-head"><h2>At a glance</h2><span className={`badge status-${job.status}`}>{job.status}</span></div>
            <div className="detail-stats">
              <div className="detail-stat"><span>Match estimate</span><strong>{score}%</strong></div>
              <div className="detail-stat"><span>Visa sponsorship</span><strong>{sponsorSignal(job) === 'sponsor' ? 'Sponsor' : sponsorSignal(job) === 'possible' ? 'Possible sponsor' : 'No signal found'}</strong></div>
              <div className="detail-stat"><span>Compensation</span><strong>{job.salary || 'Not listed'}</strong></div>
              <div className="detail-stat"><span>Saved</span><strong>{new Date(job.savedAt).toLocaleDateString()}</strong></div>
            </div>
            <p className="save-hint" style={{ marginTop: 14 }}>Match uses the AI fit score from Discover when available, otherwise a keyword estimate. Sponsor badges use the UK Home Office sponsor register when available, otherwise visa keywords in the ad. Always confirm sponsorship with the employer.</p>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Application kit</h2><span className="panel-caption">AI assist</span></div>
            <p className="save-hint" style={{ lineHeight: 1.6, marginBottom: 14 }}>Prepare role-specific material from the experience in your profile.</p>
            <div style={{ display: 'grid', gap: 8 }}><button className="button ghost" onClick={() => go(`tailor/${encodeURIComponent(activeJob.id)}`)}>Tailor CV</button><button className="button ghost" onClick={() => notify('Cover letter is a placeholder. Add a writing model to enable this workflow.')}>Cover letter</button></div>
          </section>
        </aside>
      </div>
      {Footer()}
    </>
  }

  function ProfilePage() {
    return <>
      <div className="page-heading"><div><div className="eyebrow">Your point of view</div><h1>Profile</h1><p className="subtitle">A private profile that helps you compare roles and keep your story close.</p></div><button className="button primary" onClick={() => { const form = document.getElementById('profile-form') as HTMLFormElement | null; form?.requestSubmit() }}><Icon name="check" size={15} />{savingProfile ? 'Saving…' : 'Save profile'}</button></div>
      <form id="profile-form" onSubmit={event => void saveProfile(event)}>
        <section className="panel">
          <div className="panel-head"><h2>Your basics</h2><span className="panel-caption">Stored on this device</span></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="profile-name">Name</label><input id="profile-name" value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} placeholder="How should we address you?" /></div>
            <div className="field"><label htmlFor="target-titles">Target titles</label><input id="target-titles" value={profile.targetTitles} onChange={event => setProfile({ ...profile, targetTitles: event.target.value })} placeholder="Product designer, Design lead" /><span className="help">Separate titles with commas.</span></div>
            <div className="field"><label htmlFor="skills">Skills</label><textarea id="skills" value={profile.skills} onChange={event => setProfile({ ...profile, skills: event.target.value })} placeholder="Research, prototyping, TypeScript" /><span className="help">Used to calculate a transparent keyword-based match estimate.</span></div>
            <div className="field"><label htmlFor="locations">Preferred locations</label><textarea id="locations" value={profile.locations} onChange={event => setProfile({ ...profile, locations: event.target.value })} placeholder="Toronto, remote, Ontario" /></div>
            <div className="field full">
              <div className="setting-row" style={{ padding: 0, border: 0 }}>
                <div><strong>Visa sponsorship required</strong><p>Keep this preference with your profile. Role badges are based only on visible text signals.</p></div>
                <div className="sponsorship-setting"><span>{profile.visaSponsorship ? 'Yes' : 'No'}</span><button type="button" className={`toggle ${profile.visaSponsorship ? 'on' : ''}`} aria-label="Toggle visa sponsorship requirement" aria-pressed={profile.visaSponsorship} onClick={() => setProfile({ ...profile, visaSponsorship: !profile.visaSponsorship })} /></div>
              </div>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>CV & experience</h2><span className="panel-caption">PDF, DOCX, or pasted text</span></div>
          <input ref={cvInput} className="hidden-file" type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain" onChange={event => void handleCvUpload(event)} />
          <div className="drop-zone"><p>{profile.cvFileName ? `Attached: ${profile.cvFileName}` : 'Attach a CV file to keep a local copy in your profile.'}</p><button type="button" className="button small" onClick={() => cvInput.current?.click()}><Icon name="upload" size={13} />Choose file</button><button type="button" className="button small primary" onClick={() => void fillFromCv()} disabled={fillingFromCv}>{fillingFromCv ? 'Reading CV…' : 'Fill from CV with AI'}</button></div>
          {profile.cvFileName && <div style={{ display: 'flex', gap: 12, marginTop: 9 }}><button type="button" className="text-link" onClick={() => { setProfile({ ...profile, cvFileName: '', cvFileData: '' }); notify('CV attachment removed. Save your profile to keep the change.') }}>Remove attachment</button></div>}
          <div className="field" style={{ marginTop: 15 }}><label htmlFor="cv-text">Or paste your CV text</label><textarea id="cv-text" style={{ minHeight: 190 }} value={profile.cvText} onChange={event => setProfile({ ...profile, cvText: event.target.value })} placeholder="Paste your experience, accomplishments, and skills here. Your CV content stays in your browser." /></div>
        </section>
      </form>
      {Footer()}
    </>
  }

  function SettingsPage() {
    return <>
      <div className="page-heading"><div><div className="eyebrow">Under your control</div><h1>Settings</h1><p className="subtitle">Local preferences, optional integrations, and portable backups.</p></div></div>
      <section className="panel">
        <div className="panel-head"><h2>Appearance</h2><span className="panel-caption">This device</span></div>
        <div className="setting-row"><div><strong>{theme === 'light' ? 'Light' : 'Dark'} appearance</strong><p>Switch the workspace color scheme.</p></div><button className="icon-btn" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => void toggleTheme()}><Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} /></button></div>
      </section>
      <form onSubmit={event => void saveSettings(event)}>
        <section className="panel">
          <div className="panel-head"><h2>Optional API credentials</h2><span className="panel-caption">Never included in backups</span></div>
          <p className="save-hint" style={{ lineHeight: 1.6, marginBottom: 15 }}>Keys are stored in this browser only. They are not sent anywhere by this screen. Gemini is used only when you run the explicit test.</p>
          <div className="form-grid">
            <div className="field full"><label htmlFor="ai-provider">AI provider</label><select id="ai-provider" value={models.provider} onChange={event => { const provider = event.target.value as Provider; setModels({ provider, ...PROVIDER_DEFAULTS[provider] }) }}><option value="gemini">Google Gemini</option><option value="groq">Groq (gpt-oss)</option></select></div><div className="field full"><label htmlFor="groq-key">Groq API key</label><input id="groq-key" type="password" autoComplete="new-password" value={secrets.groq} onChange={event => setSecrets({ ...secrets, groq: event.target.value })} placeholder="Needed if provider is Groq" /></div><div className="field full"><label htmlFor="gemini-key">Gemini API key</label><input id="gemini-key" type="password" autoComplete="new-password" value={secrets.gemini} onChange={event => setSecrets({ ...secrets, gemini: event.target.value })} placeholder="Enter Gemini API key" /></div>
            <div className="field"><label htmlFor="reed-key">Reed API key</label><input id="reed-key" type="password" autoComplete="new-password" value={secrets.reed} onChange={event => setSecrets({ ...secrets, reed: event.target.value })} placeholder="Optional" /></div>
            <div className="field"><label htmlFor="adzuna-id">Adzuna app ID</label><input id="adzuna-id" type="password" autoComplete="off" value={secrets.adzunaId} onChange={event => setSecrets({ ...secrets, adzunaId: event.target.value })} placeholder="Optional" /></div><div className="field"><label htmlFor="adzuna-key">Adzuna API key</label><input id="adzuna-key" type="password" autoComplete="new-password" value={secrets.adzuna} onChange={event => setSecrets({ ...secrets, adzuna: event.target.value })} placeholder="Optional" /></div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Gemini models</h2><span className="panel-caption">Model identifiers</span></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="scoring-model">Scoring model</label><input id="scoring-model" value={models.scoringModel} onChange={event => setModels({ ...models, scoringModel: event.target.value })} /></div>
            <div className="field"><label htmlFor="writing-model">Writing model</label><input id="writing-model" value={models.writingModel} onChange={event => setModels({ ...models, writingModel: event.target.value })} /></div>
          </div>
          <div className="modal-footer" style={{ justifyContent: 'flex-start' }}><button type="button" className="button" onClick={() => void testGemini()} disabled={settingsBusy}>{settingsBusy ? 'Testing…' : 'Test AI'}</button><button type="submit" className="button primary" disabled={settingsBusy}>{settingsBusy ? 'Saving…' : 'Save settings'}</button></div>
          {geminiResult && <div className="notice" role="status">{geminiResult}</div>}
          {settingsMessage && <div className="save-hint" role="status">{settingsMessage}</div>}
        </section>
      </form>
      <section className="panel">
        <div className="panel-head"><h2>Data backup</h2><span className="panel-caption">JSON · version 1</span></div>
        <p className="save-hint" style={{ lineHeight: 1.6, marginBottom: 15 }}>Export your saved jobs and non-secret settings, or merge a previous backup into this browser. Existing API keys are never exported or replaced by imports.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button className="button" onClick={() => void downloadBackup()}><Icon name="download" size={14} />Export backup</button>
          <button className="button" onClick={() => backupInput.current?.click()}><Icon name="upload" size={14} />Import backup</button>
          <input ref={backupInput} className="hidden-file" type="file" accept=".json,application/json" onChange={event => void importBackup(event)} />
        </div>
        {importSummary && <div className="notice" role="status">{importSummary}</div>}
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Privacy, by default</h2><span className="panel-caption"><Icon name="shield" size={13} /></span></div>
        <p className="description-text">Your job records, profile, notes, and preferences live in this browser's IndexedDB. Clearing browser storage removes them. No account or server sync is connected.</p>
      </section>
      {Footer()}
    </>
  }

  function Footer() {
    return <footer className="footer"><span>RoleScout · Your AI job scout.</span><span><a href={FEEDBACK_URL} target="_blank" rel="noreferrer">💬 Feedback</a> · <a href="https://buymeacoffee.com/pojithah99" target="_blank" rel="noreferrer">☕ Buy me a coffee</a> · Jobs by <a href="https://www.adzuna.com/" target="_blank" rel="noreferrer">Adzuna</a></span></footer>
  }

  const pageTitle: Record<Route['page'], string> = { dashboard: 'Workspace', discover: 'Discover', profile: 'Profile', settings: 'Settings', job: 'Opportunity', help: 'How to use', agent: 'Agent', tailor: 'Tailor CV' }
  return <div className="shell grid min-h-screen">
    <aside className="sidebar">
      <button className="brand" onClick={() => go('dashboard')} aria-label="RoleScout workspace"><img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={30} height={30} /><span><span className="brand-name">RoleScout</span><span className="brand-caption">your AI job scout</span></span></button>
      <div className="nav-label">Your workspace</div>
      {NavContent()}
      <div className="sidebar-bottom">
        <div className="local-note"><strong><span className="local-dot" />Private by design</strong><p>Your search lives in this browser. No account, no shared workspace.</p></div>
        <div className="side-profile"><div className="avatar">{initials(profile.name)}</div><div><div className="profile-name">{profile.name || 'Your profile'}</div><small>Local workspace</small></div></div>
      </div>
    </aside>
    <div className="main-area">
      <header className="topbar"><span className="crumb"><img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={18} height={18} style={{ display: "inline-block", verticalAlign: "-3px", marginRight: 6 }} />RoleScout <span style={{ padding: '0 7px', color: 'var(--line)' }}>/</span> {pageTitle[route.page]}</span><div className="top-actions"><span className="source-tag">Saved on this device</span><button className="icon-btn" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => void toggleTheme()}><Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} /></button></div></header>
      <main className="main-content">
        {route.page === 'dashboard' && Dashboard()}
        {route.page === 'job' && Detail()}
        {route.page === 'discover' && <DiscoverPage profile={profile} notify={message => notify(message)} />}
        {route.page === 'help' && <HelpPage notify={message => notify(message)} />}
        {route.page === 'agent' && <AgentPage profile={profile} notify={message => notify(message)} />}
        {route.page === 'tailor' && <TailorPage jobId={route.id ?? ''} profile={profile} notify={message => notify(message)} />}
        {route.page === 'profile' && ProfilePage()}
        {route.page === 'settings' && SettingsPage()}
      </main>
    </div>
    {modal === 'add' && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setModal(null) }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="add-title">
        <div className="modal-head"><div><h2 id="add-title">Add an opportunity</h2><p>Start a new record in your private job search.</p></div><button className="icon-btn" aria-label="Close dialog" onClick={() => setModal(null)}><Icon name="close" size={15} /></button></div>
        <form onSubmit={event => void handleAddJob(event)}>
          <div className="form-grid">
            <div className="field"><label htmlFor="add-title-field">Job title</label><input id="add-title-field" name="title" required autoFocus placeholder="Senior product designer" /></div>
            <div className="field"><label htmlFor="add-company">Company</label><input id="add-company" name="company" required placeholder="Company name" /></div>
            <div className="field full"><label htmlFor="add-url">Job listing URL</label><input id="add-url" name="url" type="url" required placeholder="https://…" /></div>
            <div className="field"><label htmlFor="add-location">Location</label><input id="add-location" name="location" placeholder="City or remote" /></div>
            <div className="field"><label htmlFor="add-salary">Compensation</label><input id="add-salary" name="salary" placeholder="Range or details" /></div>
            <div className="field"><label htmlFor="add-source">Source</label><select id="add-source" name="source" defaultValue="manual"><option value="manual">Manual</option><option value="linkedin">LinkedIn</option><option value="indeed">Indeed</option></select></div>
            <div className="field full"><label htmlFor="add-description">Description</label><textarea id="add-description" name="description" placeholder="Paste the role description to make matching and review more useful." /></div>
            <div className="field full"><label htmlFor="add-notes">First note</label><textarea id="add-notes" name="notes" placeholder="What caught your attention?" /></div>
          </div>
          <div className="modal-footer"><button type="button" className="button" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="button primary"><Icon name="plus" size={14} />Save opportunity</button></div>
        </form>
      </section>
    </div>}
    {modal === 'delete' && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setModal(null) }}><section className="modal" style={{ maxWidth: 420 }} role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><div className="modal-head"><div><h2 id="delete-title">Delete this opportunity?</h2><p>This removes its details, notes, and history from this browser.</p></div><button className="icon-btn" aria-label="Close dialog" onClick={() => setModal(null)}><Icon name="close" size={15} /></button></div><p className="danger-copy">This can't be undone unless you have an exported backup.</p><div className="modal-footer"><button className="button" onClick={() => setModal(null)}>Keep opportunity</button><button className="button danger" onClick={() => void confirmDelete()}><Icon name="trash" size={14} />Delete</button></div></section></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}

export default App;
