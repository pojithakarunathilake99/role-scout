// RoleScout MCP server (Streamable HTTP, JSON responses). Tools: UK sponsor register lookup.
const DATA = 'https://rolescout.online/data/sponsors'
const SUFFIX = /\b(limited|ltd|plc|llp|lp|inc|incorporated|co|company|corp|corporation|the)\b/g
const normalize = (s: string) =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim()
const isAgency = (c: string) =>
  /\b(recruit\w*|resourcing|staffing|talent|personnel|selection|headhunt\w*|employment|search)\b/i.test(c)

type Entry = [string, string, string, number[], number[]]
type Shard = { registerDate: string; types: string[]; routes: string[]; entries: Record<string, Entry[]> }

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json', ...cors } })

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
  const map = (e: Entry) => ({
    name: e[0], town: e[1], county: e[2],
    ratings: e[3].map(i => shard!.types[i]), routes: e[4].map(i => shard!.routes[i]),
  })
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

const TOOLS = [
  {
    name: 'check_uk_sponsor',
    title: 'Check UK visa sponsor',
    description:
      'Check whether a company is on the UK Home Office Register of Licensed Sponsors (Workers), updated daily. Returns exact or possible matches with town, rating and visa routes (e.g. Skilled Worker), and flags recruitment agencies. Use it for UK employers when the user needs visa sponsorship. Call once per company.',
    inputSchema: {
      type: 'object',
      properties: { company: { type: 'string', description: 'Company name as written in the job ad, e.g. "Arm Ltd"' } },
      required: ['company'],
    },
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

async function handle(m: Rpc) {
  if (m.id === undefined || m.id === null) return null // notification
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id: m.id, result })
  switch (m.method) {
    case 'initialize':
      return ok({
        protocolVersion: (m.params?.protocolVersion as string) ?? '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'rolescout', title: 'RoleScout', version: '0.1.0' },
        instructions: 'RoleScout tools for job seekers. Use check_uk_sponsor to see if a UK employer can sponsor work visas.',
      })
    case 'ping':
      return ok({})
    case 'tools/list':
      return ok({ tools: TOOLS })
    case 'tools/call': {
      const name = m.params?.name as string
      const args = (m.params?.arguments ?? {}) as Record<string, unknown>
      try {
        if (name === 'check_uk_sponsor') {
          const r = await checkSponsor(String(args.company ?? ''))
          return ok({ content: [{ type: 'text', text: r.text }], structuredContent: r.data, isError: false })
        }
        if (name === 'uk_sponsor_register_info') {
          const meta = await getJson<{ registerDate: string; count: number }>(`${DATA}/meta.json`)
          const text = meta ? `UK sponsor register snapshot ${meta.registerDate}: ${meta.count.toLocaleString('en-GB')} sponsors.` : 'Register info unavailable.'
          return ok({ content: [{ type: 'text', text }], structuredContent: meta ?? {}, isError: false })
        }
        return { jsonrpc: '2.0', id: m.id, error: { code: -32602, message: `Unknown tool: ${name}` } }
      } catch (e) {
        return ok({ content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true })
      }
    }
    default:
      return { jsonrpc: '2.0', id: m.id, error: { code: -32601, message: `Method not found: ${m.method}` } }
  }
}

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/')
      return new Response('RoleScout MCP server. In Claude: Settings → Connectors → Add custom connector → ' + url.origin + '/mcp', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    if (url.pathname !== '/mcp') return new Response('Not found', { status: 404 })
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST', ...cors } })
    let body: Rpc | Rpc[]
    try { body = await req.json() } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400) }
    const msgs = Array.isArray(body) ? body : [body]
    const out = []
    for (const m of msgs) { const r = await handle(m); if (r) out.push(r) }
    if (!out.length) return new Response(null, { status: 202, headers: cors })
    return json(Array.isArray(body) ? out : out[0])
  },
}
