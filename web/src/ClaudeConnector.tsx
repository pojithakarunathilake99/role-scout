const MCP_URL = 'https://mcp.rolescout.online/mcp'

const PROMPT_FIND = `You are my job-search agent. Use the RoleScout tools.
1. Read my attached CV. Pick 4–6 job titles that genuinely fit my experience.
2. For each title, run search_jobs in the UK (country gb), ads from the last 21 days.
3. Remove duplicates. Score my fit 0–100 for each promising job with a one-line reason. Be strict about seniority and missing core skills.
4. I need a Skilled Worker visa: run check_uk_sponsor for every direct employer. For recruitment agencies, say the employer is hidden and sponsorship must be confirmed.
5. Flag deal-breakers: security clearance, "no sponsorship", wrong seniority.
Output a ranked table of the top 10: Score | Title | Company | Location | Salary | Sponsor status | Why | Link.
Never invent jobs, companies or links; only use tool results.`

const PROMPT_MULTI = `You are my job-search agent. Use the RoleScout tools.
1. Read my attached CV. Pick 4–6 job titles that genuinely fit my experience.
2. For each title, run search_jobs in the UK (gb), Australia (au), Canada (ca) and the Netherlands (nl), ads from the last 21 days. (Change the countries to the ones you want: gb, us, in, au, nz, ca, sg, de, fr, nl, it, es, at, be, ch, pl.)
3. Remove duplicates. Score my fit 0–100 for each promising job with a one-line reason. Be strict about seniority and missing core skills.
4. I need visa sponsorship. For UK jobs, run check_uk_sponsor for every direct employer. For other countries, note any visa or right-to-work wording in the ad (e.g. "sponsorship available", "must have right to work").
5. Flag deal-breakers: security clearance, "no sponsorship", wrong seniority.
Output a ranked table of the top 10 across all countries: Score | Title | Company | Country | Location | Salary | Visa notes | Why | Link.
Never invent jobs, companies or links; only use tool results.`

const PROMPT_TAILOR = `Tailor my CV for job #[N] from your list.
Rules: never invent anything (no new employers, dates, titles, skills or achievements); keep every bullet under the SAME job it appears under in my CV; projects stay in Projects; UK English; ATS-friendly plain text.
Give me: a fit summary, top strengths, gaps to prepare for (do NOT add them to the CV), the full tailored CV, what you changed and why, and a 250–300 word cover letter specific to this role.
Then double-check against my original CV and confirm nothing was moved between jobs or invented.`

export default function ClaudeConnector({ notify }: { notify: (m: string) => void }) {
  const copy = (text: string, msg: string) => {
    navigator.clipboard.writeText(text).then(() => notify(msg)).catch(() => notify('Copy failed. Select the text and copy it manually.'))
  }
  const pre = { whiteSpace: 'pre-wrap' as const, fontSize: 12, background: 'var(--surface-2)', padding: 10, borderRadius: 8, marginTop: 8 }
  return (
    <section className="panel" style={{ padding: 18, marginBottom: 16, borderLeft: '4px solid var(--gold)' }}>
      <h2 className="font-semibold" style={{ fontSize: 17 }}>✳️ Use RoleScout inside Claude</h2>
      <p className="text-sm opacity-75" style={{ marginTop: 4, lineHeight: 1.6 }}>
        Add RoleScout as a connector in Claude. Claude reads your CV, ranks jobs, tailors your CV and writes cover letters, while RoleScout provides
        live jobs and UK visa-sponsor checks. <strong>No AI key needed</strong>, just a free Adzuna key for job search (sponsor checks work without one).
      </p>

      <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 12 }}>
        <code className="text-xs" style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--surface-2)' }}>{MCP_URL}</code>
        <button className="button small primary" onClick={() => copy(MCP_URL, 'Connector URL copied.')}>Copy URL</button>
      </div>

      <ol className="text-sm" style={{ marginTop: 12, paddingLeft: 18, listStyle: 'decimal', lineHeight: 1.8 }}>
        <li>In Claude, open <strong>Settings → Connectors → Add custom connector</strong>.</li>
        <li>Name: <strong>RoleScout</strong>. URL: the connector URL above.</li>
        <li>Authentication: choose <strong>Sign in now</strong>, then click <strong>Add</strong> and <strong>Connect</strong>.</li>
        <li>On the <strong>Connect RoleScout</strong> page, enter your free Adzuna app ID and key, or click <strong>Skip</strong> for sponsor checks only.</li>
        <li>In a new chat, open <strong>+ → Connectors</strong>, enable <strong>RoleScout</strong>, attach your CV and paste a prompt below.</li>
      </ol>

      <details style={{ marginTop: 10 }}>
        <summary className="text-sm" style={{ cursor: 'pointer', fontWeight: 600 }}>Prompt: find and rank jobs</summary>
        <pre style={pre}>{PROMPT_FIND}</pre>
        <button className="button small" style={{ marginTop: 6 }} onClick={() => copy(PROMPT_FIND, 'Prompt copied.')}>Copy prompt</button>
      </details>
      <details style={{ marginTop: 8 }}>
        <summary className="text-sm" style={{ cursor: 'pointer', fontWeight: 600 }}>Prompt: find jobs in several countries</summary>
        <pre style={pre}>{PROMPT_MULTI}</pre>
        <button className="button small" style={{ marginTop: 6 }} onClick={() => copy(PROMPT_MULTI, 'Prompt copied.')}>Copy prompt</button>
        <p className="text-xs opacity-60" style={{ marginTop: 6 }}>Job search works in 16 countries. The UK sponsor check only applies to UK employers.</p>
      </details>
      <details style={{ marginTop: 8 }}>
        <summary className="text-sm" style={{ cursor: 'pointer', fontWeight: 600 }}>Prompt: tailor your CV and write a cover letter</summary>
        <pre style={pre}>{PROMPT_TAILOR}</pre>
        <button className="button small" style={{ marginTop: 6 }} onClick={() => copy(PROMPT_TAILOR, 'Prompt copied.')}>Copy prompt</button>
      </details>

      <p className="text-xs opacity-60" style={{ marginTop: 10 }}>
        Privacy: your CV stays inside Claude. The RoleScout server only receives search terms and company names. Adzuna keys are stored encrypted and used only for your searches.
      </p>
    </section>
  )
}
