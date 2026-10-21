import AdzunaVideo from './AdzunaVideo'
interface Guide { id: string; name: string; badge: string; why: string; link: string; steps: string[] }

const GUIDES: Guide[] = [
  {
    id: 'gemini', name: 'Google Gemini', badge: 'AI · recommended', why: 'Reads your CV, scores jobs and runs the agent.',
    link: 'https://aistudio.google.com/apikey',
    steps: [
      'Open Google AI Studio (button below) and sign in with any Google account.',
      'Accept the terms if asked.',
      'Click "Create API key" (choose or create a project if it asks).',
      'Copy the key. It is a long string of letters and numbers.',
    ],
  },
  {
    id: 'groq', name: 'Groq', badge: 'AI · optional, fast', why: 'Very fast AI for scoring. Good alongside Gemini.',
    link: 'https://console.groq.com/keys',
    steps: [
      'Open the Groq console (button below) and sign up with Google, GitHub or email.',
      'Go to "API Keys" and click "Create API Key".',
      'Give it any name (e.g. RoleScout) and confirm.',
      'Copy the key straight away. Groq shows it only once.',
    ],
  },
  {
    id: 'adzuna', name: 'Adzuna', badge: 'Job search · required', why: 'Searches live job ads in 15 countries. Free: 1,000 searches a month.',
    link: 'https://developer.adzuna.com/signup',
    steps: [
      'Open the Adzuna developer sign-up (button below) and register (name, email, password).',
      'Confirm your email if asked, then log in to the developer dashboard.',
      'Find your "Application ID" (short) and "Application Key" (long).',
      'Copy both. RoleScout needs the ID and the key.',
    ],
  },
]

export default function KeyGuide() {
  return (
    <section className="panel" style={{ padding: 18, marginBottom: 16 }}>
      <h2 className="font-semibold" style={{ fontSize: 17 }}>How to get your free API keys</h2>
      <p className="text-sm opacity-75" style={{ marginBottom: 12 }}>
        Keys let RoleScout use AI and job search on your behalf. You need <strong>one AI key</strong> (Gemini or Groq) and the <strong>Adzuna keys</strong>.
        All are free to start, and no card is needed. Each takes about 2 minutes.
      </p>

      <div className="flex flex-col gap-2">
        {GUIDES.map(g => (
          <details key={g.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
              {g.name} <span className="text-xs opacity-60" style={{ fontWeight: 400 }}>· {g.badge}</span>
            </summary>
            <p className="text-sm opacity-75" style={{ margin: '8px 0' }}>{g.why}</p>
            <ol className="text-sm" style={{ paddingLeft: 18, listStyle: 'decimal', lineHeight: 1.8 }}>
              {g.steps.map(s => <li key={s}>{s}</li>)}
            </ol>
            {g.id === 'adzuna' && <AdzunaVideo />}
            <a className="button small primary" style={{ marginTop: 10 }} href={g.link} target="_blank" rel="noreferrer">Open {g.name}</a>
          </details>
        ))}
      </div>

      <div className="text-sm" style={{ marginTop: 14, lineHeight: 1.8 }}>
        <strong>Then paste them into RoleScout:</strong> go to{' '}
        <a className="text-link" href="#/settings">Settings</a>, choose your AI provider, paste the keys, click <strong>Save settings</strong>, then <strong>Test AI</strong>.
      </div>

      <details style={{ marginTop: 12 }}>
        <summary className="text-sm" style={{ cursor: 'pointer', fontWeight: 600 }}>Something not working?</summary>
        <ul className="text-sm" style={{ paddingLeft: 18, listStyle: 'disc', lineHeight: 1.8, marginTop: 6 }}>
          <li><strong>"Invalid key" / 401 / 403:</strong> re-copy the key with no spaces at the start or end.</li>
          <li><strong>404 model not found:</strong> in Settings, switch provider and back to reset the default models.</li>
          <li><strong>429 / rate limit:</strong> the free tier is busy. Wait a minute, or use Gemini for the agent and Groq for scoring.</li>
          <li><strong>Adzuna error:</strong> make sure both the <em>app ID</em> and the <em>app key</em> are filled in.</li>
          <li><strong>Privacy:</strong> keys are stored only in this browser and never included in backups. Don't share them.</li>
        </ul>
      </details>
    </section>
  )
}
