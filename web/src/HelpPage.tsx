import { useState } from 'react'
import GettingStarted from './GettingStarted'
import KeyGuide from './KeyGuide'
import ClaudeConnector from './ClaudeConnector'
import { WelcomeCard } from './Welcome'
import { getSetting, listJobs } from './lib/db'
import { getLLMConfig } from './lib/llm'

const REPO = 'https://github.com/pojithakarunathilake99/role-scout'

async function diagnostics() {
  const [cfg, routes, countries, jobs, last, agentRun] = await Promise.all([
    getLLMConfig(), getSetting('llm:routes'), getSetting('discover:countries'), listJobs(),
    getSetting<{ at: string }>('discover:last'), getSetting<{ at: string }>('agent:lastRun'),
  ])
  return {
    app: 'RoleScout',
    url: location.href.split('#')[0],
    when: new Date().toISOString(),
    browser: navigator.userAgent,
    llm: cfg,
    routes: routes ?? null,
    countries: countries ?? ['gb'],
    jobs: jobs.length,
    lastDiscover: last?.at ?? null,
    lastAgentRun: agentRun?.at ?? null,
  }
}

export default function HelpPage({ notify }: { notify: (m: string) => void }) {
  const [busy, setBusy] = useState(false)

  async function copyDiagnostics() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(await diagnostics(), null, 2))
      notify('Diagnostic info copied (no API keys included).')
    } catch {
      notify('Could not copy. Your browser blocked clipboard access.')
    }
  }

  async function reportBug() {
    setBusy(true)
    try {
      const d = await diagnostics()
      const body = [
        '**What happened?**', '', '',
        '**What did you expect?**', '', '',
        '**Steps to reproduce**', '1. ', '2. ', '',
        '**Screenshot / console errors (F12)**', '', '',
        '**Diagnostics (no keys)**', '```json', JSON.stringify(d, null, 2), '```',
      ].join('\n')
      const url = `${REPO}/issues/new?labels=bug&title=${encodeURIComponent('Bug: ')}&body=${encodeURIComponent(body)}`
      window.open(url, '_blank', 'noopener')
    } finally {
      setBusy(false)
    }
  }

  const zip = `${import.meta.env.BASE_URL}rolescout-extension.zip`

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Guide</div>
          <h1>How to use</h1>
          <p className="subtitle">Set up RoleScout, install the extension, and tell us when something breaks.</p>
        </div>
      </div>

      <WelcomeCard />

      <GettingStarted />

      <KeyGuide />

      <ClaudeConnector notify={notify} />

      <section className="panel" style={{ padding: 18, marginBottom: 16 }}>
        <h2 className="font-semibold" style={{ fontSize: 17 }}>Chrome extension</h2>
        <p className="text-sm opacity-75" style={{ marginBottom: 12 }}>
          Adds a <strong>Save to RoleScout</strong> button on LinkedIn, Indeed and CV-Library job pages.
        </p>
        <a className="button primary" href={zip} download>Download extension (.zip)</a>
        <ol className="text-sm" style={{ marginTop: 14, paddingLeft: 18, listStyle: 'decimal', lineHeight: 1.8 }}>
          <li>Unzip the file into a folder you'll keep (for example <code>Documents/rolescout-extension</code>).</li>
          <li>In Chrome, open <code>chrome://extensions</code> and turn on <strong>Developer mode</strong> (top right).</li>
          <li>Click <strong>Load unpacked</strong> and select the unzipped folder.</li>
          <li>Open any job on LinkedIn, Indeed or CV-Library and click <strong>Save to RoleScout</strong> (bottom right).</li>
          <li>To update: download the new zip, replace the folder contents, then click the reload icon on the extension card.</li>
        </ol>
        <p className="text-xs opacity-60" style={{ marginTop: 8 }}>
          Note: importing saved jobs from the extension into the app is still being built.
        </p>
      </section>

      <section className="panel" style={{ padding: 18, marginBottom: 16 }}>
        <h2 className="font-semibold" style={{ fontSize: 17 }}>Report a bug</h2>
        <p className="text-sm opacity-75" style={{ marginBottom: 12 }}>
          Opens a GitHub issue pre-filled with diagnostic info (browser, settings and counts; never your API keys or CV).
          You need a free GitHub account. Screenshots of the console (F12) help a lot.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button primary" onClick={() => void reportBug()} disabled={busy}>Report a bug</button>
          <button type="button" className="button" onClick={() => void copyDiagnostics()}>Copy diagnostic info</button>
          <a className="button" href={`${REPO}/issues`} target="_blank" rel="noreferrer">View known issues</a>
        </div>
      </section>

      <section className="panel" style={{ padding: 18, marginBottom: 16 }}>
        <h2 className="font-semibold" style={{ fontSize: 17 }}>Support RoleScout</h2>
        <p className="text-sm opacity-75" style={{ marginBottom: 12 }}>RoleScout is free for personal use. If it helps your job search, a coffee keeps it going.</p>
        <a className="button" href="https://buymeacoffee.com/pojithah99" target="_blank" rel="noreferrer">☕ Buy me a coffee</a>
      </section>

      <section className="panel" style={{ padding: 18 }}>
        <h2 className="font-semibold" style={{ fontSize: 17 }}>Good to know</h2>
        <ul className="text-sm" style={{ marginTop: 8, paddingLeft: 18, listStyle: 'disc', lineHeight: 1.8 }}>
          <li><strong>Scores:</strong> 0–100 AI fit against your CV; "kw" is a quick keyword match.</li>
          <li><strong>Sponsor badges (UK):</strong> checked against the Home Office register. "Possible" means a similar name, so check it. "Agency" means the real employer is hidden.</li>
          <li><strong>Free tiers:</strong> Adzuna allows 1,000 searches a month. Groq has tight per-minute limits; if you see waits, use Gemini for the agent.</li>
          <li><strong>Privacy:</strong> everything is stored in this browser. Keys never leave it except to call the AI and job APIs.</li>
        </ul>
      </section>
    </>
  )
}
