// RoleScout MCP server with OAuth sign-in (each user brings their own Adzuna keys).
import { OAuthProvider, AuthorizationError, type AuthRequest, type OAuthHelpers } from '@cloudflare/workers-oauth-provider'
import { WorkerEntrypoint } from 'cloudflare:workers'

interface Env { OAUTH_KV: KVNamespace; OAUTH_PROVIDER: OAuthHelpers }
interface Props { adzunaId?: string; adzunaKey?: string }

const DATA = 'https://rolescout.online/data/sponsors'
const COUNTRIES: Record<string, string> = {
  gb: 'United Kingdom', us: 'United States', in: 'India', au: 'Australia', nz: 'New Zealand', ca: 'Canada',
  de: 'Germany', fr: 'France', nl: 'Netherlands', it: 'Italy', es: 'Spain', at: 'Austria', be: 'Belgium',
  ch: 'Switzerland', pl: 'Poland', sg: 'Singapore',
}
const SUFFIX = /\b(limited|ltd|plc|llp|lp|inc|incorporated|co|company|corp|corporation|the)\b/g
const normalize = (s: string) =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim()
const isAgency = (c: string) => /\b(recruit\w*|resourcing|staffing|talent|personnel|selection|headhunt\w*|employment|search)\b/i.test(c)
const strip = (s = '') => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

// ---------- Sponsor register ----------
type Entry = [string, string, string, number[], number[]]
type Shard = { registerDate: string; types: string[]; routes: string[]; entries: Record<string, Entry[]> }

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cf: { cacheTtl: 3600, cacheEverything: true } } as RequestInit)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Register data unavailable (${res.status})`)
  return (await res.json()) as T
}

async function checkSponsor(company: string) {
  const n = normalize(company || '')
  if (!n) return { text: 'Please provide a company name.', data: { level: 'none' } }
  const shard = await getJson<Shard>(`${DATA}/${n.slice(0, 2).replace(/ /g, '_')}.json`)
  const map = (e: Entry) => ({ name: e[0], town: e[1], county: e[2], ratings: e[3].map(i => shard!.types[i]), routes: e[4].map(i => shard!.routes[i]) })
  let level: 'exact' | 'possible' | 'none' = 'none'
  let matches: ReturnType<typeof map>[] = []
  if (shard) {
    if (shard.entries[n]) { level = 'exact'; matches = shard.entries[n].map(map) }
    else {
      const pre = Object.keys(shard.entries).filter(k => k.startsWith(n + ' ')).sort().slice(0, 5)
      if (pre.length) { level = 'possible'; matches = pre.flatMap(k => shard.entries[k].map(map)).slice(0, 5) }
    }
  }
  const agency = isAgency(company)
  const date = shard?.registerDate ?? 'unknown'
  const head =
    level === 'exact' ? `${company}: LICENSED UK SPONSOR (exact match on the register).`
    : level === 'possible' ? `${company}: POSSIBLE match. Similar names on the register, check it is the same organisation.`
    : `${company}: NOT FOUND on the UK sponsor register.`
  const lines = matches.map(m => `- ${m.name}, ${m.town}${m.county ? `, ${m.county}` : ''}. Routes: ${m.routes.join(', ')}. Rating: ${m.ratings.join(', ')}`)
  const notes = [
    agency ? 'This name looks like a recruitment agency: the real employer is usually hidden, so check the client company instead.' : '',
    'Being a licensed sponsor does not guarantee that a particular role is eligible for sponsorship. Check the job ad and confirm with the employer.',
    `Source: UK Home Office Register of Licensed Sponsors (Workers), snapshot ${date}.`,
  ].filter(Boolean)
  return { text: [head, ...lines, '', ...notes].join('\n'), data: { company, level, agency, registerDate: date, matches } }
}

// ---------- Adzuna job search ----------
interface AdzunaJob {
  id: string; title: string; description: string; redirect_url: string; created: string
  company?: { display_name?: string }; location?: { display_name?: string }
  salary_min?: number; salary_max?: number; salary_is_predicted?: string
}

function adzunaUrl(props: Props, country: string, p: Record<string, string>) {
  const q = new URLSearchParams({ app_id: props.adzunaId!, app_key: props.adzunaKey!, ...p })
  return `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${q}`
}

async function searchJobs(props: Props, args: Record<string, unknown>) {
  if (!props.adzunaId || !props.adzunaKey)
    return { isError: true, text: 'Job search needs your free Adzuna keys. In Claude, go to Settings → Connectors, disconnect RoleScout and connect it again, then add your keys on the sign-in page (get them at https://developer.adzuna.com/signup).' }
  const query = String(args.query ?? '').trim()
  const country = String(args.country ?? 'gb').toLowerCase()
  if (!query) return { isError: true, text: 'Please provide a query (job title or keywords).' }
  if (!COUNTRIES[country]) return { isError: true, text: `Unsupported country "${country}". Use one of: ${Object.keys(COUNTRIES).join(', ')}.` }
  const p: Record<string, string> = {
    what: query,
    results_per_page: String(Math.min(30, Math.max(1, Number(args.limit) || 15))),
    max_days_old: String(Math.min(60, Math.max(1, Number(args.max_days_old) || 21))),
  }
  if (args.where) p.where = String(args.where)
  const res = await fetch(adzunaUrl(props, country, p))
  if (res.status === 401 || res.status === 403) return { isError: true, text: 'Adzuna rejected your keys. Reconnect RoleScout in Claude and re-enter them.' }
  if (!res.ok) return { isError: true, text: `Adzuna error ${res.status}. Try again shortly.` }
  const data = (await res.json()) as { count?: number; results?: AdzunaJob[] }
  const jobs = (data.results ?? []).map(j => {
    const sal = j.salary_min || j.salary_max
      ? `${Math.round(j.salary_min || j.salary_max || 0).toLocaleString('en-GB')}${j.salary_max && j.salary_max !== j.salary_min ? `–${Math.round(j.salary_max).toLocaleString('en-GB')}` : ''}${j.salary_is_predicted === '1' ? ' (estimated)' : ''}`
      : ''
    return {
      title: strip(j.title), company: strip(j.company?.display_name ?? ''), location: strip(j.location?.display_name ?? ''),
      salary: sal, posted: j.created?.slice(0, 10) ?? '', url: j.redirect_url, snippet: strip(j.description).slice(0, 300),
    }
  })
  const text = jobs.length
    ? [`${data.count ?? jobs.length} matching ads for "${query}" in ${COUNTRIES[country]}${args.where ? ` (${args.where})` : ''}; showing ${jobs.length}:`, '',
       ...jobs.map((j, i) => `${i + 1}. ${j.title}, ${j.company}, ${j.location}${j.salary ? `, ${j.salary}` : ''} (posted ${j.posted})\n   ${j.url}\n   ${j.snippet}`),
       '', 'Jobs by Adzuna.'].join('\n')
    : `No ads found for "${query}" in ${COUNTRIES[country]}. Try a broader or different title.`
  return { isError: false, text, data: { query, country, total: data.count ?? 0, jobs } }
}

// ---------- MCP ----------
const TOOLS = [
  {
    name: 'search_jobs',
    title: 'Search live jobs',
    description: `Search live job ads (via Adzuna) for one query in one country. Returns title, company, location, salary, posting date, link and a short snippet. Run several searches with different titles to cover a CV well, then compare the results against the user's CV. Countries: ${Object.entries(COUNTRIES).map(([k, v]) => `${k}=${v}`).join(', ')}.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Job title or keywords, e.g. "Embedded Linux Engineer"' },
        country: { type: 'string', description: 'Country code, default gb' },
        where: { type: 'string', description: 'Optional city or region, e.g. "Birmingham"' },
        max_days_old: { type: 'integer', description: 'Only ads newer than this many days (1-60, default 21)' },
        limit: { type: 'integer', description: 'Number of results (1-30, default 15)' },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'check_uk_sponsor',
    title: 'Check UK visa sponsor',
    description: 'Check whether a company is on the UK Home Office Register of Licensed Sponsors (Workers), updated daily. Returns exact or possible matches with town, rating and visa routes (e.g. Skilled Worker), and flags recruitment agencies. Use it for UK employers when the user needs visa sponsorship. Call once per company.',
    inputSchema: { type: 'object', properties: { company: { type: 'string', description: 'Company name as written in the job ad, e.g. "Arm Ltd"' } }, required: ['company'] },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'uk_sponsor_register_info',
    title: 'UK sponsor register info',
    description: 'Date and size of the UK sponsor register snapshot used by check_uk_sponsor.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
]

type Rpc = { jsonrpc: '2.0'; id?: string | number | null; method?: string; params?: Record<string, unknown> }

async function handle(m: Rpc, props: Props) {
  if (m.id === undefined || m.id === null) return null
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id: m.id, result })
  const tool = (text: string, data?: unknown, isError = false) => ok({ content: [{ type: 'text', text }], ...(data ? { structuredContent: data } : {}), isError })
  switch (m.method) {
    case 'initialize':
      return ok({
        protocolVersion: (m.params?.protocolVersion as string) ?? '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'rolescout', title: 'RoleScout', version: '0.2.0' },
        instructions: 'RoleScout helps job seekers. Use search_jobs to find live jobs (run several searches based on the user\'s CV), then judge fit against the CV, and use check_uk_sponsor for UK employers when the user needs a visa. Never invent jobs.',
      })
    case 'ping':
      return ok({})
    case 'tools/list':
      return ok({ tools: TOOLS })
    case 'tools/call': {
      const name = m.params?.name as string
      const args = (m.params?.arguments ?? {}) as Record<string, unknown>
      try {
        if (name === 'search_jobs') { const r = await searchJobs(props, args); return tool(r.text, r.data, r.isError) }
        if (name === 'check_uk_sponsor') { const r = await checkSponsor(String(args.company ?? '')); return tool(r.text, r.data) }
        if (name === 'uk_sponsor_register_info') {
          const meta = await getJson<{ registerDate: string; count: number }>(`${DATA}/meta.json`)
          return tool(meta ? `UK sponsor register snapshot ${meta.registerDate}: ${meta.count.toLocaleString('en-GB')} sponsors.` : 'Register info unavailable.', meta ?? undefined)
        }
        return { jsonrpc: '2.0', id: m.id, error: { code: -32602, message: `Unknown tool: ${name}` } }
      } catch (e) {
        return tool(`Error: ${e instanceof Error ? e.message : String(e)}`, undefined, true)
      }
    }
    default:
      return { jsonrpc: '2.0', id: m.id, error: { code: -32601, message: `Method not found: ${m.method}` } }
  }
}

class McpHandler extends WorkerEntrypoint<Env, Props> {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } })
    let body: Rpc | Rpc[]
    try { body = await req.json() } catch { return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 }) }
    const props = (this.ctx.props ?? {}) as Props
    const msgs = Array.isArray(body) ? body : [body]
    const out = []
    for (const m of msgs) { const r = await handle(m, props); if (r) out.push(r) }
    if (!out.length) return new Response(null, { status: 202 })
    return Response.json(Array.isArray(body) ? out : out[0])
  }
}

// ---------- Sign-in page ----------
function page(clientName: string, error = '') {
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect RoleScout</title>
<style>body{font:15px/1.5 system-ui,sans-serif;background:#0b1220;color:#e2e8f0;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
.card{background:#111827;border:1px solid #1f2937;border-radius:14px;padding:26px;max-width:440px;width:100%}h1{font-size:20px;margin:0 0 4px;color:#2dd4bf}
p{color:#94a3b8;font-size:14px}label{display:block;font-size:13px;margin-top:12px}input{width:100%;box-sizing:border-box;padding:9px 11px;border-radius:8px;border:1px solid #334155;background:#0b1220;color:#e2e8f0;margin-top:4px}
.row{display:flex;gap:8px;margin-top:18px}button{flex:1;padding:10px;border-radius:8px;border:0;font-weight:600;cursor:pointer}.go{background:#0f766e;color:#fff}.skip{background:#1f2937;color:#e2e8f0}
.err{background:#7f1d1d;color:#fecaca;padding:8px 10px;border-radius:8px;font-size:13px}a{color:#2dd4bf}</style></head><body><form class="card" method="post">
<h1>Connect RoleScout</h1><p><b>${esc(clientName)}</b> wants to use RoleScout to search jobs and check UK visa sponsors.</p>
${error ? `<div class="err">${esc(error)}</div>` : ''}
<label>Adzuna app ID<input name="adzunaId" autocomplete="off"></label>
<label>Adzuna app key<input name="adzunaKey" type="password" autocomplete="off"></label>
<p style="margin-bottom:4px"><b>No Adzuna key yet?</b> It's free and takes 2 minutes:</p>
<ol style="color:#94a3b8;font-size:13px;padding-left:18px;margin:4px 0 8px;line-height:1.7">
<li>Register at <a href="https://developer.adzuna.com/signup" target="_blank" rel="noreferrer">developer.adzuna.com/signup</a></li>
<li>Confirm your email and log in</li>
<li>Copy your <b>Application ID</b> and <b>Application Key</b> into the boxes above</li>
</ol>
<p>Your keys are stored encrypted and only used for your own searches.</p>
<div class="row"><button class="skip" name="action" value="skip">Skip (sponsor checks only)</button><button class="go" name="action" value="connect">Connect</button></div>
</form></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

const defaultHandler: ExportedHandler<Env> = {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/')
      return new Response('RoleScout MCP server. In Claude: Settings → Connectors → Add custom connector → ' + url.origin + '/mcp', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    if (url.pathname !== '/authorize') return new Response('Not found', { status: 404 })

    const form = request.method === 'POST' ? await request.clone().formData() : null
    let oauthRequest: AuthRequest
    try {
      oauthRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request)
    } catch (error) {
      if (!(error instanceof AuthorizationError)) throw error
      if (!error.redirectUri) return new Response(error.description, { status: 400 })
      const redirect = new URL(error.redirectUri)
      redirect.searchParams.set('error', error.code)
      redirect.searchParams.set('error_description', error.description)
      if (error.state) redirect.searchParams.set('state', error.state)
      if (error.issuer) redirect.searchParams.set('iss', error.issuer)
      return Response.redirect(redirect.toString(), 302)
    }
    const client = await env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId)
    if (!client) return new Response('Unknown OAuth client', { status: 400 })
    const clientName = client.clientName || 'Claude'
    if (!form) return page(clientName)

    let props: Props = {}
    if (form.get('action') === 'connect') {
      const adzunaId = String(form.get('adzunaId') ?? '').trim()
      const adzunaKey = String(form.get('adzunaKey') ?? '').trim()
      if (!adzunaId || !adzunaKey) return page(clientName, 'Enter both the app ID and the app key, or choose Skip.')
      const test = await fetch(adzunaUrl({ adzunaId, adzunaKey }, 'gb', { what: 'engineer', results_per_page: '1' }))
      if (!test.ok) return page(clientName, `Adzuna didn't accept those keys (error ${test.status}). Please check and try again.`)
      props = { adzunaId, adzunaKey }
    }
    const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
      request: oauthRequest,
      userId: crypto.randomUUID(),
      metadata: { clientName },
      scope: oauthRequest.scope,
      props,
    })
    return Response.redirect(redirectTo, 302)
  },
}

export default new OAuthProvider<Env>({
  apiRoute: '/mcp',
  apiHandler: McpHandler,
  defaultHandler,
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  clientRegistrationEndpoint: '/register',
  clientIdMetadataDocumentEnabled: true,
  resourceMetadata: {
    resource: 'https://mcp.rolescout.online/mcp',
    authorization_servers: ['https://mcp.rolescout.online'],
    resource_name: 'RoleScout',
  },
})
