// Change this to your Google Form link when ready
export const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScIcjyDdnDpo4vfGH38UnFqHsB1QHiw7q6bNX-7ei-LlNhb4A/viewform'

export function WelcomeCard() {
  return (
    <section className="panel" style={{ padding: 20, marginBottom: 16, borderLeft: '4px solid var(--accent)' }}>
      <h2 className="font-semibold" style={{ fontSize: 20 }}>Welcome to RoleScout 👋</h2>
      <p style={{ marginTop: 4, fontWeight: 600, color: 'var(--accent)' }}>Free. No sign-up. No payment.</p>
      <p className="text-sm" style={{ marginTop: 8, lineHeight: 1.7 }}>
        RoleScout finds jobs, scores how well they fit your CV, flags UK visa sponsors and tracks your applications, all in your browser.
      </p>
      <p className="text-sm" style={{ marginTop: 8, lineHeight: 1.7 }}>
        <strong>The only thing you need:</strong> a free <strong>Gemini</strong> (or Groq) AI key and a free <strong>Adzuna</strong> key.
        Both take about 2 minutes, and the guide below shows you how. Or skip AI keys entirely and use RoleScout inside Claude (see below). Your keys and CV stay in your browser and are never sent to us.
      </p>
      <p className="text-sm" style={{ marginTop: 8, lineHeight: 1.7 }}>
        <strong>Help us improve:</strong> RoleScout is new, and your feedback shapes what comes next. Tell us what works, what's confusing and what's missing.
      </p>
      <a className="button primary" style={{ marginTop: 12 }} href={FEEDBACK_URL} target="_blank" rel="noreferrer">Give feedback</a>
    </section>
  )
}

export function WelcomeBanner() {
  return (
    <section className="panel" style={{ padding: '12px 16px', marginBottom: 16, borderLeft: '4px solid var(--accent)' }}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 text-sm" style={{ minWidth: 220 }}>
          <strong>New here?</strong> RoleScout is free, with no sign-up. Add a free AI key and Adzuna key to start.
        </div>
        <a className="button small primary" href="#/help">Get started</a>
      </div>
    </section>
  )
}
