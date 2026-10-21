// Fetch UK Home Office sponsor register CSV -> data/sponsors.json
import { writeFileSync, mkdirSync } from 'node:fs';

const API = 'https://www.gov.uk/api/content/government/publications/register-of-licensed-sponsors-workers';

function parseCSV(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const SUFFIX = /\b(limited|ltd|plc|llp|lp|inc|incorporated|co|company|corp|corporation|the)\b/g;
export const normalize = s => s.toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9 ]+/g, ' ')
  .replace(SUFFIX, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const meta = await (await fetch(API)).json();
const url = meta.details.attachments.map(a => a.url).find(u => /\.csv$/i.test(u));
if (!url) throw new Error('CSV link not found');
const registerDate = (url.match(/(\d{4}-\d{2}-\d{2})\.csv$/i) || [])[1] || null;

const text = (await (await fetch(url)).text()).replace(/^\uFEFF/, '');
const [header, ...rows] = parseCSV(text);
const col = n => header.findIndex(h => h.trim() === n);
const [iName, iTown, iCounty, iType, iRoute] =
  ['Organisation Name', 'Town/City', 'County', 'Type & Rating', 'Route'].map(col);
if ([iName, iTown, iCounty, iType, iRoute].includes(-1))
  throw new Error('Unexpected headers: ' + header.join(' | '));

const types = [], routes = [];
const id = (arr, v) => { let i = arr.indexOf(v); if (i < 0) { i = arr.length; arr.push(v); } return i; };

const map = new Map();
for (const r of rows) {
  const name = (r[iName] || '').trim();
  if (!name) continue;
  const town = (r[iTown] || '').trim();
  const key = name.toLowerCase() + '|' + town.toLowerCase();
  let e = map.get(key);
  if (!e) { e = [name, town, (r[iCounty] || '').trim(), [], []]; map.set(key, e); }
  const t = (r[iType] || '').trim(), ro = (r[iRoute] || '').trim();
  if (t) { const i = id(types, t); if (!e[3].includes(i)) e[3].push(i); }
  if (ro) { const i = id(routes, ro); if (!e[4].includes(i)) e[4].push(i); }
}

const sponsors = [...map.values()];
mkdirSync('data', { recursive: true });
writeFileSync('data/sponsors.json', JSON.stringify({
  source: url, registerDate,
  fields: ['name', 'town', 'county', 'types', 'routes'],
  types, routes, count: sponsors.length, sponsors,
}));
console.log(`registerDate=${registerDate} rows=${rows.length} sponsors=${sponsors.length} types=${types.length} routes=${routes.length}`);

// ---- Shards for the MCP connector: data/sponsors/<first-2-chars>.json ----
import { rmSync } from 'node:fs'
rmSync('data/sponsors', { recursive: true, force: true })
mkdirSync('data/sponsors', { recursive: true })
const shards = new Map()
for (const s of sponsors) {
  const n = normalize(s[0])
  if (!n) continue
  const key = n.slice(0, 2).replace(/ /g, '_')
  if (!shards.has(key)) shards.set(key, {})
  const bucket = shards.get(key)
  ;(bucket[n] ??= []).push(s)
}
for (const [key, entries] of shards)
  writeFileSync(`data/sponsors/${key}.json`, JSON.stringify({ registerDate, types, routes, entries }))
writeFileSync('data/sponsors/meta.json', JSON.stringify({ registerDate, count: sponsors.length, shards: shards.size }))
console.log(`shards=${shards.size}`)
