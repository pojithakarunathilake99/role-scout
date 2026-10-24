const IMPORT_URL = 'https://raw.githubusercontent.com/pojithakarunathilake99/role-scout/master/n8n/rolescout-daily-digest.json'
const GITHUB_URL = 'https://github.com/pojithakarunathilake99/role-scout/blob/master/n8n/rolescout-daily-digest.json'
const DOCKER = `docker run -d --name n8n --restart unless-stopped -p 5678:5678 -e GENERIC_TIMEZONE=Europe/London -e TZ=Europe/London -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n`

export default function N8nCard({ notify }: { notify: (m: string) => void }) {
  const copy = (text: string, msg: string) => {
    navigator.clipboard.writeText(text).then(() => notify(msg)).catch(() => notify('Copy failed. Select the text and copy it manually.'))
  }
  const code = { fontSize: 12, padding: '6px 10px', borderRadius: 8, background: 'var(--surface-2)', wordBreak: 'break-all' as const }
  return (
    <section id="n8n" className="panel" style={{ padding: 18, marginBottom: 16, borderLeft: '4px solid var(--accent)' }}>
      <h2 className="font-semibold" style={{ fontSize: 17 }}>📬 Daily job emails with n8n</h2>
      <p className="text-sm opacity-75" style={{ marginTop: 4, lineHeight: 1.6 }}>
        Get a daily email with new jobs that fit your CV. A ready-made n8n workflow runs every morning: an AI agent uses RoleScout to search live jobs,
        scores them against your CV, checks UK sponsors if needed, and emails you the top 10. Your CV and keys stay in your own n8n.
      </p>
      <p className="text-xs opacity-70" style={{ marginTop: 6 }}>Schedule (08:00) → Your settings → AI agent (Gemini + RoleScout) → Send email</p>

      <ol className="text-sm" style={{ marginTop: 12, paddingLeft: 18, listStyle: 'decimal', lineHeight: 1.8 }}>
        <li>
          <strong>Run n8n.</strong> Free: self-host with Docker on a machine that's on every morning. Easiest: n8n Cloud (14-day trial, then paid).
          <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 6 }}>
            <button className="button small" onClick={() => copy(DOCKER, 'Docker command copied.')}>Copy Docker command</button>
            <span className="text-xs opacity-60">then open http://localhost:5678</span>
          </div>
        </li>
        <li>
          <strong>Import the template:</strong> in n8n, create a workflow → <strong>⋯ menu → Import from URL</strong> and paste:
          <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 6 }}>
            <code style={code}>{IMPORT_URL}</code>
            <button className="button small primary" onClick={() => copy(IMPORT_URL, 'Import URL copied.')}>Copy import URL</button>
            <a className="button small" href={GITHUB_URL} target="_blank" rel="noreferrer">View on GitHub</a>
          </div>
        </li>
        <li><strong>Your settings</strong> node: job titles, countries (e.g. <code>gb, de, nl</code>), minimum score, visa need, your email, and paste your CV as plain text.</li>
        <li><strong>Google Gemini Chat Model:</strong> add your free Gemini key; model <code>gemini-3.5-flash-lite</code>.</li>
        <li><strong>MCP Client Tool</strong> (RoleScout): credential <strong>MCP OAuth2</strong>, Dynamic Client Registration <strong>on</strong>, Server URL <code>https://mcp.rolescout.online/mcp</code> → <strong>Connect</strong> → enter your free Adzuna keys.</li>
        <li><strong>Send Email:</strong> SMTP credential, e.g. Gmail with an app password (<code>smtp.gmail.com</code>, port <code>465</code>, SSL on). Set the From address.</li>
        <li>Click <strong>Execute workflow</strong> to test, then <strong>Publish</strong> (or switch on <strong>Active</strong>) to run daily at 08:00.</li>
      </ol>
      <p className="text-xs opacity-60" style={{ marginTop: 8 }}>
        Uses at most about 20 searches per run, within Adzuna's free quota. The UK sponsor check only applies to UK jobs.
      </p>
    </section>
  )
}
