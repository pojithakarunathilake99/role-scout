import { useEffect, useState } from 'react'
import { FEEDBACK_URL } from './Welcome'

const REPO = 'https://github.com/pojithakarunathilake99/role-scout'
const logo = `${import.meta.env.BASE_URL}logo.svg`

const FEATURES = [
  { icon: '🤖', title: 'AI job agent', text: 'Give it a goal. It plans searches, scores jobs against your CV, and saves the best picks for you to review. 5-minute runs.' },
  { icon: '🎯', title: 'Fit scores, not keyword spam', text: 'Every job gets a 0–100 fit score with a one-line reason, and catches deal-breakers like security clearance or "no sponsorship".' },
  { icon: '🛂', title: 'UK visa sponsor check', text: "Each UK employer is checked against the Home Office sponsor register, updated daily. Agencies are flagged because the real employer is hidden." },
  { icon: '🌍', title: '15 countries', text: 'UK, India, Australia, New Zealand, Canada and nine European countries. Sri Lanka is coming soon.' },
  { icon: '📋', title: 'Application tracker', text: 'Save jobs and move them from Saved to Applied, Interview and Offer, with notes and history.' },
  { icon: '✳️', title: 'Works inside Claude', text: 'Add RoleScout as a Claude connector: Claude searches live jobs, checks UK sponsors and tailors your CV. No AI key needed.' },
  { icon: '🧩', title: 'Chrome extension (beta)', text: 'Save the job you are viewing on LinkedIn, Indeed or CV-Library with one click.' },
]

const FAQ = [
  { q: 'Is it really free?', a: 'Yes. RoleScout is free for personal use, with no sign-up and no payment. It uses free API keys from Google Gemini (or Groq) and Adzuna, which you create yourself in a couple of minutes.' },
  { q: 'Do I need a ChatGPT or Gemini subscription?', a: 'No. App subscriptions don’t include API keys anyway. A free Gemini API key is all you need, and the guide shows you how.' },
  { q: 'Does it apply to jobs for me?', a: 'No, never. It finds, scores and saves jobs. You review them and apply yourself.' },
  { q: 'Where is my data stored?', a: 'Only in your browser. Your CV, jobs and keys never reach our servers, because there are none. Export a backup anytime.' },
  { q: 'Can I use RoleScout inside Claude?', a: 'Yes. Add it as a custom connector in Claude (Settings → Connectors) with the URL on the How to use page. Claude then searches live jobs, checks UK visa sponsors and tailors your CV, with no AI key needed.' },
  { q: 'Is the sponsor badge a guarantee?', a: 'No. It checks the official UK register, but a licensed sponsor may not sponsor every role. Always confirm with the employer.' },
]

export default function Landing() {
  const [copied, setCopied] = useState(false)
  const MCP_URL = 'https://rolescout-mcp.rolecout.workers.dev/mcp'
  // Landing page is always dark; restore the app's theme when leaving
  useEffect(() => {
    const root = document.documentElement
    const prev = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'dark')
    return () => {
      if (prev) root.setAttribute('data-theme', prev)
      else root.removeAttribute('data-theme')
    }
  }, [])

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh' }}>
      {/* Nav */}
      <header className="flex items-center gap-3" style={{ maxWidth: 1080, margin: '0 auto', padding: '18px 20px' }}>
        <img src={logo} alt="" width={30} height={30} />
        <span style={{ fontWeight: 700, fontSize: 19 }}>
          <span style={{ color: 'var(--accent)' }}>Role</span><span style={{ color: 'var(--gold)' }}>Scout</span>
        </span>
        <nav className="flex items-center gap-4 text-sm" style={{ marginLeft: 'auto' }}>
          <a href="#how" onClick={e => { e.preventDefault(); document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }) }} className="hidden sm:inline opacity-80">How it works</a>
          <a href="#claude" onClick={e => { e.preventDefault(); document.getElementById('claude')?.scrollIntoView({ behavior: 'smooth' }) }} className="hidden sm:inline opacity-80">In Claude</a>
          <a href="#faq" onClick={e => { e.preventDefault(); document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }) }} className="hidden sm:inline opacity-80">FAQ</a>
          <a className="button small primary" href="#/discover">Open app</a>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 880, margin: '0 auto', padding: '48px 20px 32px', textAlign: 'center' }}>
        <div className="flex flex-wrap justify-center gap-2" style={{ marginBottom: 18 }}>
          {['Free', 'No sign-up', 'Private: runs in your browser'].map(b => (
            <span key={b} className="text-xs" style={{ padding: '5px 12px', borderRadius: 99, background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>{b}</span>
          ))}
        </div>
        <h1 style={{ fontSize: 'clamp(30px, 6vw, 52px)', lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Find jobs that fit you, and know who can <span style={{ color: 'var(--accent)' }}>sponsor your visa</span>.
        </h1>
        <p style={{ margin: '18px auto 0', maxWidth: 640, fontSize: 'clamp(15px, 2.2vw, 18px)', color: 'var(--muted)', lineHeight: 1.6 }}>
          RoleScout is an AI job scout. It searches live jobs, scores how well each one fits your CV, flags UK visa sponsors, and tracks your applications. Free, with no account needed.
        </p>
        <div className="flex flex-wrap justify-center gap-3" style={{ marginTop: 28 }}>
          <a className="button primary" href="#/help" style={{ padding: '12px 22px', fontSize: 16 }}>Get started — it’s free</a>
          <a className="button" href="#/discover" style={{ padding: '12px 22px', fontSize: 16 }}>Open the app</a>
        </div>
        <p className="text-xs" style={{ marginTop: 12, color: 'var(--muted)' }}>Setup takes about 5 minutes: upload your CV and add two free API keys.</p>
        <a href="#claude" onClick={e => { e.preventDefault(); document.getElementById('claude')?.scrollIntoView({ behavior: 'smooth' }) }} className="text-sm" style={{ display: 'inline-block', marginTop: 14, padding: '6px 14px', borderRadius: 99, border: '1px solid var(--gold)', color: 'var(--gold)', fontWeight: 600 }}>
          ✳️ New: use RoleScout inside Claude →
        </a>
      </section>

      {/* RoleScout inside Claude */}
      <section id="claude" style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px' }}>
        <div className="panel" style={{ padding: 28, borderLeft: '4px solid var(--gold)' }}>
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex-1" style={{ minWidth: 280 }}>
              <span className="text-xs" style={{ padding: '4px 10px', borderRadius: 99, background: 'var(--gold)', color: '#111', fontWeight: 800 }}>NEW</span>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 12, lineHeight: 1.15 }}>RoleScout, inside Claude</h2>
              <p style={{ marginTop: 10, color: 'var(--muted)', lineHeight: 1.65 }}>
                Add RoleScout as a connector and just ask: <em>“Find embedded jobs in the UK that sponsor visas, and tailor my CV for the best one.”</em>
                Claude searches live jobs, checks the UK sponsor register, and writes your tailored CV and cover letter. <strong style={{ color: 'var(--ink)' }}>No AI key needed.</strong>
              </p>
              <ul style={{ marginTop: 14, lineHeight: 1.9, fontSize: 14 }}>
                <li>✓ Live jobs in 16 countries</li>
                <li>✓ UK visa-sponsor checks, updated daily</li>
                <li>✓ CV tailoring and cover letters written by Claude</li>
                <li>✓ Your CV stays inside Claude</li>
              </ul>
              <div className="flex flex-wrap gap-3" style={{ marginTop: 18 }}>
                <a className="button primary" href="#/help">Set it up in 2 minutes</a>
                <button className="button" type="button" onClick={() => { void navigator.clipboard.writeText(MCP_URL).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }}>
                  {copied ? 'Copied ✓' : 'Copy connector URL'}
                </button>
              </div>
              <p className="text-xs" style={{ marginTop: 12, color: 'var(--muted)' }}>
                Built on the open Model Context Protocol (MCP), so it also works with other MCP-compatible AI tools.
              </p>
            </div>
            <div className="flex-1" style={{ minWidth: 280 }}>
              <div className="text-xs" style={{ color: 'var(--muted)', marginBottom: 6 }}>Example conversation</div>
              <div className="panel" style={{ padding: 16, fontSize: 13, lineHeight: 1.55 }}>
                <div style={{ background: 'var(--accent-soft)', color: 'var(--ink)', padding: '8px 12px', borderRadius: 12, marginLeft: 'auto', maxWidth: '85%' }}>
                  Here’s my CV. Find IoT jobs near Birmingham that can sponsor my visa.
                </div>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--muted)', margin: '10px 0 4px' }}>🔧 search_jobs · “IoT Engineer” · gb · West Midlands</div>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>🔧 check_uk_sponsor · “Arm Ltd” → licensed sponsor ✓</div>
                <div style={{ background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 12, maxWidth: '90%' }}>
                  I found 12 matching roles. Here’s your ranked shortlist with fit scores, sponsor status and links. Want me to tailor your CV for the top one?
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 20px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 750, textAlign: 'center' }}>How it works</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: 24 }}>
          {[
            { n: '1', t: 'Upload your CV', d: 'AI reads it and fills in your target titles, skills and locations. You choose whether you need visa sponsorship.' },
            { n: '2', t: 'Let the agent scout', d: 'It searches live jobs in your chosen countries, scores each one for fit, refines its searches, and saves the best.' },
            { n: '3', t: 'Review and apply', d: 'See scores, reasons and sponsor badges, open the ads you like, apply, and track your progress.' },
          ].map(s => (
            <div key={s.n} className="panel" style={{ padding: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 99, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{s.n}</div>
              <h3 style={{ fontWeight: 700, marginTop: 12, fontSize: 17 }}>{s.t}</h3>
              <p className="text-sm" style={{ marginTop: 6, color: 'var(--muted)', lineHeight: 1.6 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 20px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 750, textAlign: 'center' }}>What you get</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginTop: 24 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 26 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginTop: 8, fontSize: 16 }}>{f.title}</h3>
              <p className="text-sm" style={{ marginTop: 6, color: 'var(--muted)', lineHeight: 1.6 }}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px' }}>
        <div className="panel" style={{ padding: 24, borderLeft: '4px solid var(--accent)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 750 }}>🔒 Private by design</h2>
          <p className="text-sm" style={{ marginTop: 8, lineHeight: 1.7, color: 'var(--muted)' }}>
            There are no accounts and no servers storing your data. Your CV, saved jobs and API keys stay in your own browser.
            The only data that leaves it are requests made with your own keys, to the AI provider and the job-search API.
            On Google Gemini’s free tier, Google may use prompts to improve its models; use a paid key if that matters to you.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 750, textAlign: 'center' }}>FAQ</h2>
        <div className="flex flex-col gap-2" style={{ marginTop: 20 }}>
          {FAQ.map(f => (
            <details key={f.q} className="panel" style={{ padding: '14px 18px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{f.q}</summary>
              <p className="text-sm" style={{ marginTop: 8, color: 'var(--muted)', lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px 56px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 750 }}>Ready to scout your next role?</h2>
        <div className="flex flex-wrap justify-center gap-3" style={{ marginTop: 18 }}>
          <a className="button primary" href="#/help" style={{ padding: '12px 22px', fontSize: 16 }}>Get started — it’s free</a>
          <a className="button" href={FEEDBACK_URL} target="_blank" rel="noreferrer" style={{ padding: '12px 22px', fontSize: 16 }}>Give feedback</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-wrap justify-center gap-4 text-xs" style={{ padding: '20px', borderTop: '1px solid var(--line)', color: 'var(--muted)' }}>
        <span>© 2026 RoleScout</span>
        <a href="https://buymeacoffee.com/pojithah99" target="_blank" rel="noreferrer">☕ Buy me a coffee</a>
        <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>
        <a href={`${REPO}/blob/master/LICENSE`} target="_blank" rel="noreferrer">Licence</a>
        <span>Jobs by <a href="https://www.adzuna.com/" target="_blank" rel="noreferrer">Adzuna</a></span>
      </footer>
    </div>
  )
}
