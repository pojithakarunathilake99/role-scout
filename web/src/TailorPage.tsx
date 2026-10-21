import { useEffect, useState } from 'react'
import { getJob, updateJob, type Job } from './lib/db'
import { generateJSON } from './lib/llm'

interface ProfileLike { name?: string; cvText: string; targetTitles: string; skills: string }
type Tailored = NonNullable<Job['tailored']>

const SYSTEM = `You are an expert UK CV writer. You tailor a CV to one specific job WITHOUT inventing anything.
Never add employers, job titles, dates, degrees, certifications, tools, skills or achievements that are not in the original CV.
You may reorder sections, rephrase bullet points, emphasise the most relevant experience, tighten wording, and use the job's terminology where it truthfully applies.
STRICT STRUCTURE RULES:
- Keep the original sections and every job/role exactly as they are (same employer, title and dates).
- Every bullet under a job must come from THAT SAME job in the original CV. Never move bullets between jobs.
- Personal projects, education, publications and teaching stay in their own sections. Never place them under an employer.
- If unsure where something belongs, leave it where it was in the original.
Use UK English. ATS-friendly plain text: section headings in CAPITALS, bullet points starting with "- ", no tables or columns. Aim for about 2 pages.`

const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string)
const safeName = (s: string) => s.replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'CV'
const list = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean) : [])

export default function TailorPage({ jobId, profile, notify }: { jobId: string; profile: ProfileLike; notify: (m: string) => void }) {
  const [job, setJob] = useState<Job | null | undefined>(undefined)
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [t, setT] = useState<Tailored | null>(null)
  const [cv, setCv] = useState('')

  useEffect(() => {
    getJob(jobId)
      .then(j => {
        setJob(j ?? null)
        setDesc(j?.description ?? '')
        if (j?.tailored) { setT(j.tailored); setCv(j.tailored.cv) }
      })
      .catch(() => setJob(null))
  }, [jobId])

  if (job === undefined) return null
  if (job === null) return <section className="panel" style={{ padding: 20 }}>Job not found. <a className="text-link" href="#/dashboard">Back to Workspace</a></section>

  const shortDesc = desc.trim().length < 800
  const hasCv = !!profile.cvText?.trim()

  async function tailor(fix?: string) {
    if (!job) return
    setBusy(true)
    try {
      if (desc !== (job.description ?? '')) await updateJob(job.id, { description: desc })
      const r = await generateJSON<Record<string, unknown>>({
        task: 'writing',
        system: SYSTEM,
        prompt: `JOB
Title: ${job.title}
Company: ${job.company}
Location: ${job.location ?? ''}
Description:
${desc.slice(0, 6000)}

ORIGINAL CV
${profile.cvText.slice(0, 12000)}

Return JSON with:
- "fit": 2-3 sentence honest summary of how well the candidate fits this job
- "strengths": up to 5 strongest matching points
- "gaps": up to 5 job requirements the CV does not show (do NOT add them to the CV)
- "keywords": job keywords that ARE truthfully supported by the CV and were emphasised
- "cv": the full tailored CV as plain text
- "changes": up to 8 short notes on what you changed and why${fix ? `\n\nIMPORTANT: a fact-check found these problems in your previous version. Fix every one of them:\n${fix}` : ''}`,
      })
      const next: Tailored = {
        cv: String(r.cv ?? '').trim(),
        fit: String(r.fit ?? ''),
        strengths: list(r.strengths),
        gaps: list(r.gaps),
        keywords: list(r.keywords),
        changes: list(r.changes),
        at: new Date().toISOString(),
      }
      if (!next.cv) throw new Error('The AI did not return a CV. Please try again.')
      // Fact-check pass: compare against the original CV
      try {
        const v = await generateJSON<Record<string, unknown>>({
          task: 'scoring',
          system: 'You are a strict CV fact-checker. You only report real problems, quoting lines exactly.',
          prompt: `ORIGINAL CV
${profile.cvText.slice(0, 12000)}

TAILORED CV
${next.cv.slice(0, 12000)}

List every problem in the TAILORED CV:
(a) any bullet or item placed under a different job, role or section than in the original (e.g. a personal project listed under an employer)
(b) any employer, title, date, degree, certification, tool, skill or achievement that is not in the original
(c) any changed job titles or dates
Quote the exact tailored line. Return JSON {"issues":[{"line":"...","problem":"..."}]}; use an empty list if there are none.`,
        })
        const arr = (Array.isArray(v) ? v : Object.values(v).find(x => Array.isArray(x)) ?? []) as Record<string, unknown>[]
        next.issues = arr
          .map(x => ({ line: String(x.line ?? ''), problem: String(x.problem ?? '') }))
          .filter(x => x.line || x.problem)
          .slice(0, 12)
      } catch {
        next.issues = undefined
      }
      setT(next)
      setCv(next.cv)
      await updateJob(job.id, { tailored: next })
      notify('Tailored CV ready. Review it before sending.')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Tailoring failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveEdits() {
    if (!job || !t) return
    const next = { ...t, cv, at: new Date().toISOString() }
    setT(next)
    await updateJob(job.id, { tailored: next })
    notify('Edits saved.')
  }

  function download() {
    const blob = new Blob([cv], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `CV - ${safeName(profile.name || 'CV')} - ${safeName(job?.company ?? '')}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // Turn the plain-text CV into a clean, print-ready HTML layout
  function cvToHtml(text: string) {
    const lines = text.split('\n').map(l => l.trim())
    let html = ''
    let inList = false
    let seen = 0
    const close = () => { if (inList) { html += '</ul>'; inList = false } }
    for (const t of lines) {
      if (!t) { close(); continue }
      seen++
      const isHeading = t.length < 60 && /[A-Z]/.test(t) && t === t.toUpperCase() && !/@/.test(t)
      if (seen === 1) { html += `<h1>${esc(t)}</h1>`; continue }
      if (/@|linkedin|github|\+\d/i.test(t) && seen <= 4) { close(); html += `<div class="contact">${esc(t)}</div>`; continue }
      if (seen <= 3 && isHeading && !/^(PROFESSIONAL|CORE|EDUCATION|PROJECTS|CERTIFICATIONS|REFEREES|TECHNICAL)/.test(t)) { html += `<div class="headline">${esc(t)}</div>`; continue }
      if (isHeading) { close(); html += `<h2>${esc(t)}</h2>`; continue }
      if (/^[-•*]\s+/.test(t)) {
        if (!inList) { html += '<ul>'; inList = true }
        html += `<li>${esc(t.replace(/^[-•*]\s+/, ''))}</li>`
        continue
      }
      const role = t.match(/^(.+[—–-].+?)\s*\|\s*([^|]+)$/)
      if (role && /(19|20)\d\d/.test(role[2])) {
        close()
        html += `<div class="role"><span>${esc(role[1])}</span><span class="date">${esc(role[2])}</span></div>`
        continue
      }
      close()
      html += `<p>${esc(t)}</p>`
    }
    close()
    return html
  }

  function printPdf() {
    const w = window.open('', '_blank')
    if (!w) { notify('Allow pop-ups to print or save as PDF.'); return }
    const title = `CV - ${safeName(profile.name || 'CV')} - ${safeName(job?.company ?? '')}`
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      @page { size: A4; margin: 0 }
      body { font: 10pt/1.42 "Helvetica Neue", Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 14mm 16mm; }
      h1 { font-size: 20pt; margin: 0; letter-spacing: .5px; color: #0f766e }
      .headline { font-weight: 600; font-size: 10.5pt; margin-top: 2px }
      .contact { color: #555; font-size: 9pt; margin: 4px 0 6px }
      h2 { font-size: 10pt; letter-spacing: 1.2px; color: #0f766e; border-bottom: 1.5px solid #0f766e; padding-bottom: 2px; margin: 12px 0 5px; break-after: avoid }
      .role { display: flex; justify-content: space-between; gap: 12px; font-weight: 700; margin-top: 8px; break-after: avoid }
      .date { font-weight: 400; color: #555; white-space: nowrap }
      ul { margin: 3px 0 0 16px; padding: 0 }
      li { margin: 2px 0; break-inside: avoid }
      p { margin: 3px 0 }
    </style></head><body>${cvToHtml(cv)}</body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Tailor CV</div>
          <h1 style={{ fontSize: 26 }}>{job.title}</h1>
          <p className="subtitle">{job.company}{job.location ? ` · ${job.location}` : ''} · <a className="text-link" href={`#/job/${encodeURIComponent(job.id)}`}>Back to job</a></p>
        </div>
        <button className="button primary" disabled={busy || !hasCv || !desc.trim()} onClick={() => void tailor()}>
          {busy ? 'Tailoring…' : t ? 'Tailor again' : 'Tailor my CV'}
        </button>
      </div>

      {!hasCv && (
        <section className="panel" style={{ padding: '12px 16px', marginBottom: 16, borderLeft: '4px solid var(--gold)' }}>
          Upload your CV on the <a className="text-link" href="#/profile">Profile</a> page first.
        </section>
      )}

      <section className="panel" style={{ padding: 16, marginBottom: 16 }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
          <strong className="text-sm">Job description</strong>
          <span className="text-xs opacity-60">{desc.trim().length.toLocaleString()} characters</span>
          <a className="text-link text-xs" href={job.url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto' }}>Open the ad</a>
        </div>
        {shortDesc && (
          <p className="text-xs" style={{ color: 'var(--gold)', marginBottom: 6 }}>
            Only a short snippet is saved. Open the ad, copy the full description and paste it below for a much better result.
          </p>
        )}
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={shortDesc ? 8 : 5} disabled={busy}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }} />
      </section>

      {t && (
        <>
          <section className="panel" style={{ padding: 18, marginBottom: 16 }}>
            <h2 className="font-semibold" style={{ fontSize: 17 }}>Fit summary</h2>
            <p className="text-sm" style={{ marginTop: 6, lineHeight: 1.7 }}>{t.fit}</p>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginTop: 12 }}>
              <div>
                <strong className="text-sm">✓ Strengths</strong>
                <ul className="text-sm" style={{ marginTop: 4, paddingLeft: 18, listStyle: 'disc', lineHeight: 1.7 }}>{t.strengths.map(x => <li key={x}>{x}</li>)}</ul>
              </div>
              <div>
                <strong className="text-sm">⚠ Gaps (not added to your CV)</strong>
                <ul className="text-sm" style={{ marginTop: 4, paddingLeft: 18, listStyle: 'disc', lineHeight: 1.7 }}>{t.gaps.map(x => <li key={x}>{x}</li>)}</ul>
                {t.gaps.length > 0 && <p className="text-xs opacity-60" style={{ marginTop: 4 }}>Be ready to address these in your cover letter or interview.</p>}
              </div>
            </div>
            {t.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
                {t.keywords.map(k => <span key={k} className="text-xs" style={{ padding: '3px 10px', borderRadius: 99, background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>{k}</span>)}
              </div>
            )}
          </section>

          {t.issues && t.issues.length > 0 ? (
            <section className="panel" style={{ padding: 16, marginBottom: 16, borderLeft: '4px solid #dc2626' }}>
              <strong className="text-sm">⚠ Fact-check found {t.issues.length} problem{t.issues.length === 1 ? '' : 's'}. Fix before using this CV:</strong>
              <ul className="text-sm" style={{ marginTop: 6, paddingLeft: 18, listStyle: 'disc', lineHeight: 1.7 }}>
                {t.issues.map((x, k) => <li key={k}><em>“{x.line}”</em>: {x.problem}</li>)}
              </ul>
              <button className="button small primary" style={{ marginTop: 8 }} disabled={busy}
                onClick={() => void tailor((t.issues ?? []).map(x => `- "${x.line}": ${x.problem}`).join('\n'))}>
                {busy ? 'Fixing…' : 'Fix these automatically'}
              </button>
            </section>
          ) : t.issues ? (
            <section className="panel" style={{ padding: '10px 16px', marginBottom: 16, borderLeft: '4px solid var(--green)' }}>
              <span className="text-sm">✓ Fact-check passed: nothing invented or moved between roles. Still give it a quick read.</span>
            </section>
          ) : null}

          <section className="panel" style={{ padding: 18, marginBottom: 16 }}>
            <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 8 }}>
              <h2 className="font-semibold" style={{ fontSize: 17 }}>Tailored CV</h2>
              <span className="text-xs opacity-60">Edit freely. AI can make mistakes, so review before sending.</span>
            </div>
            <textarea value={cv} onChange={e => setCv(e.target.value)} rows={24}
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, lineHeight: 1.55 }} />
            <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
              <button className="button small primary" onClick={() => void saveEdits()}>Save edits</button>
              <button className="button small" onClick={() => { void navigator.clipboard.writeText(cv).then(() => notify('Copied.')) }}>Copy</button>
              <button className="button small" onClick={download}>Download .txt</button>
              <button className="button small" onClick={printPdf}>Print / Save as PDF</button>
            </div>
          </section>

          {t.changes.length > 0 && (
            <section className="panel" style={{ padding: 18 }}>
              <h2 className="font-semibold" style={{ fontSize: 16 }}>What changed</h2>
              <ul className="text-sm" style={{ marginTop: 6, paddingLeft: 18, listStyle: 'disc', lineHeight: 1.7 }}>{t.changes.map(x => <li key={x}>{x}</li>)}</ul>
            </section>
          )}
        </>
      )}
    </>
  )
}
