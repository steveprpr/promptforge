import { useState, useEffect } from 'react'

const C = {
  bg: '#080b10', surface: '#0e1219', surfaceHigh: '#131922',
  border: '#1a2030', borderHigh: '#243040',
  amber: '#f59e0b', cyan: '#22d3ee', purple: '#a78bfa',
  green: '#4ade80', red: '#f87171', copilot: '#0078d4',
  text: '#e2e8f0', textMuted: '#64748b', textDim: '#94a3b8',
}

// OpenRouter model IDs + pricing — see https://openrouter.ai/models
// Grouped by cost tier. Default = best value option.
const MODELS = [
  // Fast & Cheap
  { id: 'deepseek/deepseek-chat',                label: 'DeepSeek V3',          price: '$0.14/1M',  group: 'Fast & Cheap' },
  { id: 'deepseek/deepseek-r1',                  label: 'DeepSeek R1',          price: '$0.55/1M',  group: 'Fast & Cheap' },
  { id: 'google/gemini-flash-1.5',               label: 'Gemini Flash 1.5',     price: '$0.08/1M',  group: 'Fast & Cheap' },
  { id: 'openai/gpt-4o-mini',                    label: 'GPT-4o mini',          price: '$0.15/1M',  group: 'Fast & Cheap' },
  { id: 'anthropic/claude-haiku-4-5',            label: 'Claude Haiku 4.5',     price: '$0.80/1M',  group: 'Fast & Cheap' },
  { id: 'meta-llama/llama-3.3-70b-instruct',     label: 'Llama 3.3 70B',        price: '$0.39/1M',  group: 'Fast & Cheap' },
  // Balanced
  { id: 'openai/gpt-4o',                         label: 'GPT-4o',               price: '$2.50/1M',  group: 'Balanced' },
  { id: 'google/gemini-pro-1.5',                 label: 'Gemini Pro 1.5',       price: '$1.25/1M',  group: 'Balanced' },
  { id: 'anthropic/claude-sonnet-4-5',           label: 'Claude Sonnet 4',      price: '$3/1M',     group: 'Balanced' },
  // Powerful
  { id: 'anthropic/claude-opus-4-5',             label: 'Claude Opus 4',        price: '$15/1M',    group: 'Powerful' },
  // Special modes (Copilot — not callable via OpenRouter, triggers Copilot system prompt)
  { id: 'copilot-work',  label: 'Microsoft Copilot (Work)', price: 'mode only', group: 'Microsoft' },
  { id: 'm365-copilot',  label: 'M365 Copilot',             price: 'mode only', group: 'Microsoft' },
]

const DEFAULT_MODEL = 'deepseek/deepseek-chat'

// Copilot is not on OpenRouter — fall back to DeepSeek V3 for actual generation
const COPILOT_FALLBACK_MODEL = 'deepseek/deepseek-chat'

const isCopilotModel = (id) => id === 'copilot-work' || id === 'm365-copilot'

const ROLE_PRESETS = [
  'Cybersecurity Analyst', 'Policy Advisor', 'Risk Assessor',
  'Executive Communicator', 'Technical Writer', 'Data Analyst',
  'Project Manager', 'Legal Reviewer', 'IT Administrator',
]

const TONE_OPTIONS = ['Professional', 'Direct', 'Formal', 'Conversational', 'Persuasive', 'Analytical', 'Empathetic']
const AUDIENCE_OPTIONS = ['Executive Leadership', 'Technical Team', 'General Staff', 'External Clients', 'Regulators', 'Congress']
const FORMAT_OPTIONS = ['Prose', 'Bullet Points', 'Numbered List', 'Table', 'Executive Summary', 'Memo', 'Report']
const LENGTH_OPTIONS = ['Concise (1-2 para)', 'Standard (3-5 para)', 'Detailed (5+ para)', 'Comprehensive']
const REASONING_OPTIONS = ['Standard', 'Step-by-step', 'Chain-of-thought', 'Pros/Cons', "Devil's Advocate"]

const HUMANIZATION_OPTS = [
  { key: 'contractions', label: 'Use contractions', desc: "Don't, won't, it's" },
  { key: 'sentenceVariation', label: 'Vary sentence length', desc: 'Mix short punchy + longer flowing' },
  { key: 'firstPerson', label: 'First-person voice', desc: 'I, we, my, our' },
  { key: 'naturalImperfections', label: 'Natural imperfections', desc: 'Avoid overly polished prose' },
  { key: 'avoidSymmetry', label: 'Avoid perfect symmetry', desc: 'No 3-point lists every time' },
  { key: 'concreteExamples', label: 'Concrete examples', desc: 'Ground abstract ideas' },
  { key: 'strongVoice', label: 'Strong authorial voice', desc: 'Opinionated, not wishy-washy' },
]

const ANTI_PATTERN_OPTS = [
  { key: 'noFiller', label: 'No AI filler phrases', desc: '"Certainly!", "Great question!"' },
  { key: 'noPassive', label: 'No passive voice', desc: 'Use active constructions' },
  { key: 'noBulletOverload', label: 'No bullet overload', desc: 'Avoid walls of bullets' },
  { key: 'noHedging', label: 'No excessive hedging', desc: '"It may perhaps possibly..."' },
  { key: 'noJargon', label: 'No unnecessary jargon', desc: 'Plain language preferred' },
  { key: 'noRepetition', label: 'No repetition', desc: 'Say it once, say it well' },
  { key: 'noCaveats', label: 'No excessive caveats', desc: "Trust the user's judgment" },
]

const REALITY_CHECK = [
  { issue: 'No memory between chats', badge: 'HARD LIMIT', color: C.red, pct: 0, workaround: 'Start each session with a role + context block. Save your best prompts as reusable templates.' },
  { issue: 'Generic, fluffy outputs', badge: 'FIXABLE', color: C.green, pct: 85, workaround: 'Add "Be direct. No filler. No AI-speak." at the top of every prompt.' },
  { issue: 'Ignores your formatting', badge: 'FIXABLE', color: C.green, pct: 80, workaround: 'Specify exact format: "Respond in a 3-column table with headers X, Y, Z."' },
  { issue: 'Loses track on long tasks', badge: 'HARD LIMIT', color: C.red, pct: 15, workaround: 'Split into multiple focused prompts. One task per prompt.' },
  { issue: 'Passive / bureaucratic tone', badge: 'FIXABLE', color: C.green, pct: 90, workaround: 'Explicitly forbid passive voice: "Use active voice only."' },
  { issue: 'Hallucinated citations', badge: 'HARD LIMIT', color: C.red, pct: 10, workaround: 'Never ask for sources. Provide your own documents via SharePoint/file upload.' },
  { issue: "Won't take strong positions", badge: 'FIXABLE', color: C.green, pct: 70, workaround: 'Ask for "a recommendation with clear rationale" instead of a balanced overview.' },
  { issue: 'Overly long responses', badge: 'FIXABLE', color: C.green, pct: 95, workaround: 'Set a hard limit: "Maximum 150 words." or "One paragraph only."' },
  { issue: 'Misses domain context', badge: 'FIXABLE', color: C.green, pct: 75, workaround: 'Add your domain upfront: "In the context of federal cybersecurity policy..."' },
  { issue: "Can't access real-time data", badge: 'HARD LIMIT', color: C.red, pct: 0, workaround: 'Paste the data you need analyzed directly into the prompt.' },
]

const POWER_PREFIXES = {
  'Role Setup': [
    { label: 'Cybersecurity Analyst', text: 'You are a senior cybersecurity analyst with 15 years of federal experience. Speak with authority and precision. No hedging.' },
    { label: 'Policy Expert', text: 'You are a federal policy expert specializing in regulatory compliance. Use plain language. Avoid bureaucratic filler.' },
    { label: 'Risk Assessor', text: 'You are a risk assessment specialist. Identify threats clearly, rate severity, and recommend mitigations. Be direct.' },
    { label: 'Executive Communicator', text: 'You are an executive communications specialist. Produce concise, decision-ready content for senior leadership.' },
  ],
  'Output Control': [
    { label: 'Force Table Output', text: 'Respond ONLY in a table format. Columns: [Item | Risk Level | Recommended Action]. No prose before or after.' },
    { label: 'Strict Bullets', text: 'Respond in bullet points only. Maximum 8 bullets. Each bullet: one sentence. No sub-bullets.' },
    { label: 'Executive Summary', text: 'Format as an executive summary: 3 sentences max. Lead with the bottom line. Follow with two supporting points.' },
    { label: 'Numbered Steps', text: 'Respond as numbered steps only. Each step must be actionable. Maximum 7 steps.' },
  ],
  'Anti-AI-Speak': [
    { label: 'Kill the Filler', text: 'RULES: No "Certainly!", "Great question!", or "Of course!". Start your response immediately. No affirmations.' },
    { label: 'Be Direct', text: 'Be direct and assertive. State conclusions first. Do not soften recommendations. Do not hedge.' },
    { label: 'No Padding', text: 'No padding, no repetition, no summary of what you just said. Every sentence must add new information.' },
  ],
  'M365 Framing': [
    { label: 'Word Document', text: 'Format this as a professional Word document. Include: Title, Executive Summary, Body sections with headers, Conclusion.' },
    { label: 'Teams Update', text: 'Write this as a Teams channel update. Conversational tone. Keep under 100 words.' },
    { label: 'Outlook Email', text: 'Write this as a professional email. Subject line first. Clear ask in paragraph 1. Supporting detail in paragraph 2. Action item last.' },
    { label: 'SharePoint Summary', text: 'Write this as a SharePoint page summary. Clear headline. 2-sentence description. 3 bullet key points. No jargon.' },
  ],
}

const WORK_TEMPLATES = [
  { title: 'Zero Trust Posture Brief', text: `You are a senior cybersecurity analyst. Write a one-page Zero Trust posture brief for [AGENCY/ORG NAME].

Context: [DESCRIBE CURRENT STATE — e.g., "We have completed identity pillar implementation but network segmentation is 40% complete."]

Include:
- Current posture summary (2 sentences)
- Top 3 gaps with risk ratings (High/Medium/Low)
- Recommended next 90-day actions
- One metric to track progress

Format: Professional memo. Active voice. No filler. Maximum 400 words.` },

  { title: 'Risk Assessment Memo', text: `You are a federal risk assessment specialist. Write a risk assessment memo for [RISK TOPIC].

Organization: [ORG NAME]
Timeframe: [ASSESSMENT PERIOD]
Audience: [CISO / Senior Leadership / etc.]

Structure:
1. Risk Summary (2 sentences)
2. Risk Matrix (table: Risk | Likelihood | Impact | Priority)
3. Top 3 Mitigations with owners and timelines
4. Residual risk statement

Tone: Direct. Authoritative. No hedging. No passive voice.` },

  { title: 'Policy Summary (Plain Language)', text: `Summarize [POLICY NAME] in plain language for a non-expert audience.

Policy text:
[PASTE POLICY TEXT HERE]

Format:
- What this policy does (1 sentence)
- Who it affects (1 sentence)
- What you need to do (numbered list, max 5 items)
- Key deadline or effective date

Rules: No jargon. No passive voice. 8th-grade reading level.` },

  { title: 'One-Page Briefing Paper', text: `Write a one-page briefing paper on [TOPIC] for [AUDIENCE].

Key facts to include:
[LIST 3-5 FACTS OR BULLET POINTS]

Position to convey:
[WHAT RECOMMENDATION SHOULD THIS SUPPORT?]

Format: Title, Issue, Background (3 sentences), Analysis (4-5 sentences), Recommendation (2 sentences). Maximum 500 words. Active voice only.` },

  { title: 'Meeting Notes → Action Items', text: `Convert the following meeting notes into a structured action item summary.

Meeting notes:
[PASTE NOTES HERE]

Output format:
1. Meeting summary (2 sentences max)
2. Action items table: | Action | Owner | Due Date | Priority |
3. Open questions / parking lot items
4. Next meeting date (if mentioned)

Rules: Extract only what was explicitly stated. Flag ambiguous owners as "[TBD]". No editorializing.` },

  { title: 'Untangle an Email Chain', text: `Read the email chain below and produce a clear summary.

Email chain:
[PASTE EMAIL CHAIN HERE]

Produce:
1. What was asked (original request in 1 sentence)
2. Current status (1 sentence)
3. Unresolved questions or blockers (bullet list)
4. Recommended next action (1 sentence)
5. Who needs to act and by when

Format: Brief and scannable. No filler. No passive voice.` },

  { title: 'Document Risk Review', text: `Review the following document for risk, compliance gaps, or concerns.

Document:
[PASTE DOCUMENT TEXT HERE]

Review against: [FRAMEWORK — e.g., NIST 800-53, FISMA, agency policy]

Output:
1. Overall risk rating: High / Medium / Low
2. Top findings (table: Finding | Severity | Recommendation)
3. Compliant sections (brief list)
4. Recommended actions before approval

Be direct. Flag real concerns clearly. Do not soften findings.` },

  { title: 'Project Status Report', text: `Write a project status report for [PROJECT NAME].

Reporting period: [DATE RANGE]
Overall status: [Green / Yellow / Red]

Provide:
1. Status summary (2 sentences — lead with overall health)
2. Accomplishments this period (bullet list, max 5)
3. Planned next period (bullet list, max 5)
4. Risks and issues (table: Item | Impact | Mitigation)
5. Budget/schedule variance: [INSERT DATA]

Format: Professional. Scannable. No filler.` },
]

const SYSTEM_PROMPT_BASE = `You are an expert prompt engineer specializing in the RACE framework (Role, Action, Context, Expect). Synthesize the user's inputs into a single optimized AI prompt.

RACE framework:
- Role: Who the AI should be / what expertise to embody
- Action: The specific task, verb-forward and precise
- Context: Background, constraints, audience, environment
- Expect: Exact output format, length, tone, quality criteria

Rules:
- Lead with the role declaration
- Make the action specific and actionable
- Include only context that changes the output
- Specify output format with precision
- Apply any humanization, anti-pattern, and style preferences
- For Copilot targets: keep under 400 words, single-task, explicit format rules

Return ONLY valid JSON, no markdown fences:
{
  "optimizedPrompt": "the complete ready-to-use prompt",
  "raceBreakdown": {
    "role": "how the role element is expressed",
    "action": "how the action element is expressed",
    "context": "how the context element is expressed",
    "expect": "how the expected output element is expressed"
  },
  "rationale": "2-3 sentences explaining why this prompt performs well",
  "copilotNotes": "Copilot-specific notes if targeting Copilot, otherwise null",
  "tips": ["tip 1", "tip 2", "tip 3"]
}`

const COPILOT_SYSTEM_PROMPT = `You are a Microsoft Copilot prompt optimization specialist. You understand Copilot's constraints: no persistent memory, single-task focus, prompt length sensitivity (keep under 400 words), tendency toward AI-speak without suppression, and need for explicit format instructions.

Convert the provided prompt into the most effective Copilot version possible.

Return ONLY valid JSON, no markdown fences:
{
  "optimizedPrompt": "the complete Copilot-optimized prompt",
  "changes": ["specific change made and why", "..."],
  "splitPrompts": ["part 1", "part 2"] or null if not needed,
  "copilotTip": "one specific actionable tip for using this in Copilot",
  "estimatedImprovement": "honest 1-2 sentence assessment of expected improvement"
}`

const stripFences = (s) => s.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
const nowStamp = () => new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// ── Shared UI primitives ──────────────────────────────────────

function CopyButton({ text, small }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{
        padding: small ? '4px 10px' : '8px 16px',
        background: copied ? C.green + '22' : C.surfaceHigh,
        border: `1px solid ${copied ? C.green : C.border}`,
        borderRadius: 6, color: copied ? C.green : C.textMuted,
        fontSize: small ? 11 : 13, cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s', flexShrink: 0,
      }}
    >{copied ? '✓ Copied' : 'Copy'}</button>
  )
}

function PillSelector({ options, value, onChange, color }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(value === opt ? '' : opt)} style={{
          padding: '4px 12px', borderRadius: 20,
          border: `1px solid ${value === opt ? color : C.border}`,
          background: value === opt ? color + '22' : 'transparent',
          color: value === opt ? color : C.textMuted,
          fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>{opt}</button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange, label, desc }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '5px 0' }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 36, height: 20, borderRadius: 10, flexShrink: 0,
        background: checked ? C.cyan : C.border, position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
      }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: checked ? 18 : 3, transition: 'left 0.2s' }} />
      </div>
      <div>
        <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: C.textMuted }}>{desc}</div>}
      </div>
    </label>
  )
}

function Accordion({ title, isOpen, onToggle, children }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{
        width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: C.surfaceHigh, border: 'none', cursor: 'pointer',
        color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
      }}>
        {title}
        <span style={{ color: C.textMuted, fontSize: 11 }}>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: 16, background: C.surface, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState('build')
  const [copilotSection, setCopilotSection] = useState('reality')

  // Form
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [role, setRole] = useState('')
  const [action, setAction] = useState('')
  const [context, setContext] = useState('')
  const [expect, setExpect] = useState('')
  const [tone, setTone] = useState('')
  const [audience, setAudience] = useState('')
  const [format, setFormat] = useState('')
  const [length, setLength] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [human, setHuman] = useState({ contractions: false, sentenceVariation: false, firstPerson: false, naturalImperfections: false, avoidSymmetry: false, concreteExamples: false, strongVoice: false })
  const [anti, setAnti] = useState({ noFiller: true, noPassive: false, noBulletOverload: false, noHedging: false, noJargon: false, noRepetition: false, noCaveats: false })
  const [customAnti, setCustomAnti] = useState('')
  const [useFewShot, setUseFewShot] = useState(false)
  const [extraInstructions, setExtraInstructions] = useState('')
  const [acc, setAcc] = useState({ style: false, human: false, anti: false, examples: false })

  // Output
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refining, setRefining] = useState(false)
  const [error, setError] = useState('')

  // Copilot translator
  const [xlInput, setXlInput] = useState('')
  const [xlResult, setXlResult] = useState(null)
  const [xlLoading, setXlLoading] = useState(false)
  const [xlError, setXlError] = useState('')

  // Templates (editable)
  const [templates, setTemplates] = useState(WORK_TEMPLATES.map(t => t.text))

  // History
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pf_history') || '[]') } catch { return [] }
  })
  useEffect(() => { localStorage.setItem('pf_history', JSON.stringify(history.slice(0, 30))) }, [history])

  const copilotMode = isCopilotModel(model)

  const callAPI = async (system, userContent) => {
    // Use selected model; fall back to Haiku for Copilot (not on OpenRouter)
    const apiModel = isCopilotModel(model) ? COPILOT_FALLBACK_MODEL : model
    const res = await fetch('/.netlify/functions/generate-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: apiModel, messages: [{ role: 'user', content: userContent }], system, max_tokens: 2048 }),
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`) }
    const data = await res.json()
    return stripFences(data.content[0].text)
  }

  const buildMessage = (refinePrev = null) => {
    const humanOn = Object.entries(human).filter(([, v]) => v).map(([k]) => HUMANIZATION_OPTS.find(o => o.key === k)?.label).filter(Boolean)
    const antiOn = Object.entries(anti).filter(([, v]) => v).map(([k]) => ANTI_PATTERN_OPTS.find(o => o.key === k)?.label).filter(Boolean)
    return [
      refinePrev ? `REFINE THIS PROMPT:\n${refinePrev}\n\nImprove it while maintaining the same intent.` : null,
      `TARGET MODEL: ${MODELS.find(m => m.id === model)?.label ?? model}`,
      role && `ROLE: ${role}`,
      action && `ACTION: ${action}`,
      context && `CONTEXT: ${context}`,
      expect && `EXPECTED OUTPUT: ${expect}`,
      tone && `TONE: ${tone}`,
      audience && `AUDIENCE: ${audience}`,
      format && `OUTPUT FORMAT: ${format}`,
      length && `OUTPUT LENGTH: ${length}`,
      reasoning && `REASONING MODE: ${reasoning}`,
      humanOn.length && `HUMANIZATION: ${humanOn.join(', ')}`,
      antiOn.length && `SUPPRESS: ${antiOn.join(', ')}`,
      customAnti && `ALSO SUPPRESS: ${customAnti}`,
      useFewShot && 'INCLUDE: Few-shot example structure',
      extraInstructions && `EXTRA INSTRUCTIONS: ${extraInstructions}`,
    ].filter(Boolean).join('\n')
  }

  const handleGenerate = async () => {
    if (!role && !action) { setError('Add at least a Role or Action to generate.'); return }
    setError(''); setLoading(true); setResult(null)
    try {
      const parsed = JSON.parse(await callAPI(SYSTEM_PROMPT_BASE, buildMessage()))
      setResult(parsed)
      setHistory(h => [{ id: Date.now(), model, ts: nowStamp(), role: role.slice(0, 40), action: action.slice(0, 60), prompt: parsed.optimizedPrompt, formState: { model, role, action, context, expect, tone, audience, format, length, reasoning, human, anti, customAnti, useFewShot, extraInstructions }, result: parsed }, ...h])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleRefine = async () => {
    if (!result?.optimizedPrompt) return
    setError(''); setRefining(true)
    try { setResult(JSON.parse(await callAPI(SYSTEM_PROMPT_BASE, buildMessage(result.optimizedPrompt)))) }
    catch (e) { setError(e.message) }
    finally { setRefining(false) }
  }

  const handleTranslate = async () => {
    if (!xlInput.trim()) { setXlError('Paste a prompt to translate.'); return }
    setXlError(''); setXlLoading(true); setXlResult(null)
    try { setXlResult(JSON.parse(await callAPI(COPILOT_SYSTEM_PROMPT, `PROMPT TO OPTIMIZE:\n${xlInput}`))) }
    catch (e) { setXlError(e.message) }
    finally { setXlLoading(false) }
  }

  const restoreEntry = (entry) => {
    const s = entry.formState
    setModel(s.model); setRole(s.role); setAction(s.action); setContext(s.context); setExpect(s.expect)
    setTone(s.tone); setAudience(s.audience); setFormat(s.format); setLength(s.length); setReasoning(s.reasoning)
    setHuman(s.human); setAnti(s.anti); setCustomAnti(s.customAnti); setUseFewShot(s.useFewShot); setExtraInstructions(s.extraInstructions)
    setResult(entry.result); setActiveTab('build')
  }

  // Shared styles
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }
  const input = { width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: 'vertical', outline: 'none' }
  const label = { fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'block' }

  // ── Build Tab ─────────────────────────────────────────────────
  const buildTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {copilotMode && (
        <div style={{ background: C.copilot + '18', border: `1px solid ${C.copilot}44`, borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🪟</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.copilot, marginBottom: 2 }}>Copilot Mode Active</div>
            <div style={{ fontSize: 12, color: C.textDim }}>Prompts optimized for Copilot constraints — shorter, single-task, explicit format rules. Visit the Copilot tab for power prefixes and templates.</div>
          </div>
        </div>
      )}

      {/* RACE Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* R */}
        <div style={{ ...card, borderLeft: `3px solid ${C.amber}`, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 26, height: 26, borderRadius: 6, background: C.amber + '22', color: C.amber, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", flexShrink: 0 }}>R</span>
            <div><div style={{ fontSize: 12, fontWeight: 700, color: C.amber }}>Role</div><div style={{ fontSize: 11, color: C.textMuted }}>Who should the AI be?</div></div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
            {ROLE_PRESETS.map(p => (
              <button key={p} onClick={() => setRole(p)} style={{ padding: '3px 9px', borderRadius: 20, border: `1px solid ${role === p ? C.amber : C.border}`, background: role === p ? C.amber + '22' : 'transparent', color: role === p ? C.amber : C.textMuted, fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{p}</button>
            ))}
          </div>
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="Or type a custom role..." style={input} />
        </div>

        {/* A */}
        <div style={{ ...card, borderLeft: `3px solid ${C.cyan}`, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 26, height: 26, borderRadius: 6, background: C.cyan + '22', color: C.cyan, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", flexShrink: 0 }}>A</span>
            <div><div style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>Action</div><div style={{ fontSize: 11, color: C.textMuted }}>What specific task?</div></div>
          </div>
          <textarea value={action} onChange={e => setAction(e.target.value)} placeholder="Describe the specific task to perform..." rows={5} style={input} />
        </div>

        {/* C */}
        <div style={{ ...card, borderLeft: `3px solid ${C.purple}`, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 26, height: 26, borderRadius: 6, background: C.purple + '22', color: C.purple, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", flexShrink: 0 }}>C</span>
            <div><div style={{ fontSize: 12, fontWeight: 700, color: C.purple }}>Context</div><div style={{ fontSize: 11, color: C.textMuted }}>Background & constraints</div></div>
          </div>
          <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="Audience, environment, constraints, relevant background..." rows={5} style={input} />
        </div>

        {/* E */}
        <div style={{ ...card, borderLeft: `3px solid ${C.green}`, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 26, height: 26, borderRadius: 6, background: C.green + '22', color: C.green, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", flexShrink: 0 }}>E</span>
            <div><div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Expect</div><div style={{ fontSize: 11, color: C.textMuted }}>Format & quality criteria</div></div>
          </div>
          <textarea value={expect} onChange={e => setExpect(e.target.value)} placeholder="Format, length, tone, quality criteria..." rows={5} style={input} />
        </div>
      </div>

      {/* Accordions */}
      <Accordion title="Style & Delivery" isOpen={acc.style} onToggle={() => setAcc(p => ({ ...p, style: !p.style }))}>
        <div><span style={label}>Tone</span><PillSelector options={TONE_OPTIONS} value={tone} onChange={setTone} color={C.amber} /></div>
        <div><span style={label}>Audience</span><PillSelector options={AUDIENCE_OPTIONS} value={audience} onChange={setAudience} color={C.cyan} /></div>
        <div><span style={label}>Output Format</span><PillSelector options={FORMAT_OPTIONS} value={format} onChange={setFormat} color={C.purple} /></div>
        <div><span style={label}>Output Length</span><PillSelector options={LENGTH_OPTIONS} value={length} onChange={setLength} color={C.green} /></div>
        <div><span style={label}>Reasoning Mode</span><PillSelector options={REASONING_OPTIONS} value={reasoning} onChange={setReasoning} color={C.textDim} /></div>
      </Accordion>

      <Accordion title="Humanization" isOpen={acc.human} onToggle={() => setAcc(p => ({ ...p, human: !p.human }))}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {HUMANIZATION_OPTS.map(o => <Toggle key={o.key} checked={human[o.key]} onChange={v => setHuman(p => ({ ...p, [o.key]: v }))} label={o.label} desc={o.desc} />)}
        </div>
      </Accordion>

      <Accordion title="Anti-Patterns" isOpen={acc.anti} onToggle={() => setAcc(p => ({ ...p, anti: !p.anti }))}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {ANTI_PATTERN_OPTS.map(o => <Toggle key={o.key} checked={anti[o.key]} onChange={v => setAnti(p => ({ ...p, [o.key]: v }))} label={o.label} desc={o.desc} />)}
        </div>
        <div><span style={label}>Custom patterns to suppress</span><input value={customAnti} onChange={e => setCustomAnti(e.target.value)} placeholder='"synergy", "circle back", "moving the needle"' style={input} /></div>
      </Accordion>

      <Accordion title="Examples & Extra Instructions" isOpen={acc.examples} onToggle={() => setAcc(p => ({ ...p, examples: !p.examples }))}>
        <Toggle checked={useFewShot} onChange={setUseFewShot} label="Include few-shot example structure" desc="Adds example input/output format to the prompt" />
        <div><span style={label}>Additional instructions</span><textarea value={extraInstructions} onChange={e => setExtraInstructions(e.target.value)} placeholder="Any other requirements or constraints..." rows={3} style={input} /></div>
      </Accordion>

      <button onClick={handleGenerate} disabled={loading} style={{
        padding: '14px 24px', borderRadius: 10, border: 'none',
        background: copilotMode ? C.copilot : `linear-gradient(135deg, ${C.amber}, ${C.cyan})`,
        color: copilotMode ? '#fff' : '#000', fontWeight: 700, fontSize: 15,
        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
        fontFamily: "'DM Sans',sans-serif", transition: 'opacity 0.2s',
      }}>
        {loading ? 'Generating...' : '⚡ Generate Optimized Prompt'}
      </button>

      {error && <div style={{ background: C.red + '18', border: `1px solid ${C.red}44`, borderRadius: 8, padding: '12px 16px', color: C.red, fontSize: 13 }}>{error}</div>}

      {/* Output */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...card, border: `1px solid ${copilotMode ? C.copilot + '66' : C.cyan + '55'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: copilotMode ? C.copilot : C.cyan }}>Optimized Prompt</span>
              <CopyButton text={result.optimizedPrompt} />
            </div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.text, lineHeight: 1.65 }}>{result.optimizedPrompt}</pre>
          </div>

          {result.raceBreakdown && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>RACE Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['R', 'Role', C.amber, result.raceBreakdown.role], ['A', 'Action', C.cyan, result.raceBreakdown.action], ['C', 'Context', C.purple, result.raceBreakdown.context], ['E', 'Expect', C.green, result.raceBreakdown.expect]].map(([l, lbl, col, val]) => (
                  <div key={l} style={{ background: col + '0e', border: `1px solid ${col}2a`, borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 4, background: col + '33', color: col, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif" }}>{l}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: col, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{lbl}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {copilotMode && result.copilotNotes && (
            <div style={{ background: C.copilot + '12', border: `1px solid ${C.copilot}44`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.copilot, marginBottom: 6 }}>🪟 Copilot Notes</div>
              <p style={{ margin: 0, fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{result.copilotNotes}</p>
            </div>
          )}

          {result.rationale && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why It Works</div>
              <p style={{ margin: 0, fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{result.rationale}</p>
            </div>
          )}

          {result.tips?.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Refinement Tips</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {result.tips.map((t, i) => <li key={i} style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>{t}</li>)}
              </ul>
            </div>
          )}

          <button onClick={handleRefine} disabled={refining} style={{
            padding: '12px 20px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.surfaceHigh, color: C.text, fontSize: 13, fontWeight: 600,
            cursor: refining ? 'not-allowed' : 'pointer', opacity: refining ? 0.7 : 1, fontFamily: "'DM Sans',sans-serif",
          }}>{refining ? 'Refining...' : '↻ Refine This Prompt'}</button>
        </div>
      )}
    </div>
  )

  // ── Copilot Tab ───────────────────────────────────────────────
  const SECTION_META = {
    reality:    { icon: '🔍', title: 'Reality Check',     desc: 'Understand what Microsoft Copilot can and cannot do before you waste time fighting it. Each card below is a common frustration — green FIXABLE means the right prompt fixes it, red HARD LIMIT means it\'s a fundamental architectural constraint no prompt can overcome.' },
    prefixes:   { icon: '⚡', title: 'Power Prefixes',    desc: 'Copy-paste openers that instantly improve any Copilot prompt. Drop one at the top of your prompt to set the role, lock the output format, kill AI-speak, or frame your request for M365 apps like Word, Teams, or Outlook.' },
    templates:  { icon: '📋', title: 'Work Templates',    desc: 'Pre-built, Copilot-optimized prompts for common federal workplace tasks. Each template is editable — replace the bracketed [PLACEHOLDERS] with your real content, then copy and paste directly into Copilot.' },
    translator: { icon: '🔄', title: 'Prompt Translator', desc: 'Have a prompt that works well in ChatGPT or Claude but falls flat in Copilot? Paste it here and the AI will rewrite it specifically for Copilot\'s constraints — shorter, single-task, explicit format rules — and explain every change it made.' },
  }

  const copilotTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Tab intro */}
      <div style={{ background: C.copilot + '12', border: `1px solid ${C.copilot}33`, borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>🪟</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.copilot, marginBottom: 4 }}>Microsoft Copilot Toolkit</div>
            <p style={{ margin: 0, fontSize: 13, color: C.textDim, lineHeight: 1.65 }}>
              Microsoft Copilot is built into M365 (Word, Teams, Outlook) but behaves very differently from ChatGPT or Claude. It has no memory between sessions, struggles with multi-step tasks, and defaults to generic AI-speak without explicit instructions.
              This toolkit gives you everything you need to get professional, consistent output from Copilot at work.
            </p>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              {[['🔍 Reality Check', 'Know the limits'], ['⚡ Power Prefixes', 'Instant prompt upgrades'], ['📋 Work Templates', 'Ready-to-use prompts'], ['🔄 Translator', 'Convert any prompt for Copilot']].map(([label, sub]) => (
                <div key={label} style={{ fontSize: 11, color: C.textMuted }}>
                  <span style={{ color: C.copilot, fontWeight: 600 }}>{label}</span> — {sub}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section nav */}
      <div style={{ display: 'flex', gap: 4, background: C.surface, borderRadius: 10, padding: 4, border: `1px solid ${C.border}` }}>
        {[['reality', 'Reality Check'], ['prefixes', 'Power Prefixes'], ['templates', 'Work Templates'], ['translator', 'Prompt Translator']].map(([id, lbl]) => (
          <button key={id} onClick={() => setCopilotSection(id)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 7, border: 'none',
            background: copilotSection === id ? C.copilot : 'transparent',
            color: copilotSection === id ? '#fff' : C.textMuted,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s',
          }}>{lbl}</button>
        ))}
      </div>

      {/* Section description */}
      {SECTION_META[copilotSection] && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', background: C.surfaceHigh, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{SECTION_META[copilotSection].icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>{SECTION_META[copilotSection].title}</div>
            <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>{SECTION_META[copilotSection].desc}</p>
          </div>
        </div>
      )}

      {copilotSection === 'reality' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: C.copilot + '15', border: `1px solid ${C.copilot}44`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.copilot, marginBottom: 4 }}>The Bottom Line for Federal Work</div>
            <p style={{ margin: 0, fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>Copilot is capable with real limits. Use it for formatting, summarizing, and drafting — not research, citations, or multi-step reasoning. The fixes below address 80% of common frustrations.</p>
          </div>
          {REALITY_CHECK.map((item, i) => (
            <div key={i} style={{ ...card, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }}>{item.issue}</div>
                <span style={{ padding: '2px 8px', borderRadius: 4, background: item.color + '22', color: item.color, fontSize: 10, fontWeight: 700, marginLeft: 8, flexShrink: 0 }}>{item.badge}</span>
              </div>
              {item.pct > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: C.textMuted }}>Improvement potential</span>
                    <span style={{ fontSize: 11, color: item.color, fontWeight: 600 }}>{item.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: C.border, borderRadius: 2 }}><div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: 2 }} /></div>
                </div>
              )}
              <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>💡 {item.workaround}</p>
            </div>
          ))}
        </div>
      )}

      {copilotSection === 'prefixes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(POWER_PREFIXES).map(([cat, items]) => (
            <div key={cat}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.copilot, marginBottom: 10 }}>{cat}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item, i) => (
                  <div key={i} style={{ ...card, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>{item.label}</div>
                        <p style={{ margin: 0, fontSize: 12, color: C.textMuted, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.6 }}>{item.text}</p>
                      </div>
                      <CopyButton text={item.text} small />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {copilotSection === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {WORK_TEMPLATES.map((t, i) => (
            <div key={i} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.title}</div>
                <CopyButton text={templates[i]} small />
              </div>
              <textarea value={templates[i]} onChange={e => setTemplates(p => { const n = [...p]; n[i] = e.target.value; return n })} rows={8} style={{ ...input, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.6 }} />
            </div>
          ))}
        </div>
      )}

      {copilotSection === 'translator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Prompt Translator</div>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: C.textMuted }}>Paste any prompt — Claude, GPT-4, handwritten — and get a Copilot-optimized version with a list of changes.</p>
            <textarea value={xlInput} onChange={e => setXlInput(e.target.value)} placeholder="Paste your prompt here..." rows={6} style={input} />
            <button onClick={handleTranslate} disabled={xlLoading} style={{ marginTop: 12, padding: '12px 20px', borderRadius: 8, border: 'none', background: C.copilot, color: '#fff', fontSize: 13, fontWeight: 700, cursor: xlLoading ? 'not-allowed' : 'pointer', opacity: xlLoading ? 0.7 : 1, fontFamily: "'DM Sans',sans-serif" }}>
              {xlLoading ? 'Translating...' : '🪟 Translate for Copilot'}
            </button>
            {xlError && <div style={{ marginTop: 10, color: C.red, fontSize: 12 }}>{xlError}</div>}
          </div>

          {xlResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ ...card, border: `1px solid ${C.copilot}55` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.copilot }}>Copilot-Optimized Prompt</span>
                  <CopyButton text={xlResult.optimizedPrompt} />
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.text, lineHeight: 1.65 }}>{xlResult.optimizedPrompt}</pre>
              </div>
              {xlResult.changes?.length > 0 && (
                <div style={card}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Changes Made</div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {xlResult.changes.map((c, i) => <li key={i} style={{ fontSize: 12, color: C.textDim }}>{c}</li>)}
                  </ul>
                </div>
              )}
              {xlResult.splitPrompts && (
                <div style={card}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Split Into Multiple Prompts</div>
                  {xlResult.splitPrompts.map((p, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: C.textMuted }}>Prompt {i + 1}</span>
                        <CopyButton text={p} small />
                      </div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.text, background: C.bg, padding: 10, borderRadius: 6 }}>{p}</pre>
                    </div>
                  ))}
                </div>
              )}
              {xlResult.copilotTip && (
                <div style={{ background: C.copilot + '15', border: `1px solid ${C.copilot}33`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.copilot, marginBottom: 4 }}>TIP</div>
                  <p style={{ margin: 0, fontSize: 12, color: C.textDim }}>{xlResult.copilotTip}</p>
                </div>
              )}
              {xlResult.estimatedImprovement && (
                <div style={{ ...card, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Honest Assessment</div>
                  <p style={{ margin: 0, fontSize: 12, color: C.textDim }}>{xlResult.estimatedImprovement}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ── History Tab ───────────────────────────────────────────────
  const historyTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted, fontSize: 14 }}>No history yet. Generate your first prompt to get started.</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.textMuted }}>{history.length} saved prompt{history.length !== 1 ? 's' : ''}</span>
            <button onClick={() => setHistory([])} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${C.red}44`, borderRadius: 6, color: C.red, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Clear All</button>
          </div>
          {history.map(entry => (
            <div key={entry.id} onClick={() => restoreEntry(entry)}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.cyan + '66'}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              style={{ ...card, cursor: 'pointer', transition: 'border-color 0.15s' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>{MODELS.find(m => m.id === entry.model)?.label ?? entry.model}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{entry.ts}</div>
              </div>
              {entry.role && <div style={{ fontSize: 12, color: C.amber, marginBottom: 2 }}>Role: {entry.role}</div>}
              {entry.action && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{entry.action.slice(0, 80)}{entry.action.length > 80 ? '…' : ''}</div>}
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.textMuted, background: C.bg, padding: '8px 10px', borderRadius: 6, lineHeight: 1.5 }}>
                {entry.prompt.slice(0, 180)}{entry.prompt.length > 180 ? '…' : ''}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>Click to restore →</div>
            </div>
          ))}
        </>
      )}
    </div>
  )

  // ── Root ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'DM Sans',sans-serif" }}>
      {/* Header */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg,${C.amber},${C.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, background: `linear-gradient(135deg,${C.amber},${C.cyan})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PromptForge</span>
            <span style={{ fontSize: 11, color: C.textMuted, background: C.bg, padding: '2px 8px', borderRadius: 4, border: `1px solid ${C.border}` }}>RACE Framework</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>Model:</span>
            <select value={model} onChange={e => setModel(e.target.value)} style={{ background: C.bg, border: `1px solid ${copilotMode ? C.copilot : C.border}`, borderRadius: 6, color: copilotMode ? C.copilot : C.text, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", outline: 'none', maxWidth: 220 }}>
              {['Fast & Cheap', 'Balanced', 'Powerful', 'Microsoft'].map(g => (
                <optgroup key={g} label={g}>
                  {MODELS.filter(m => m.group === g).map(m => (
                    <option key={m.id} value={m.id}>{m.label} — {m.price}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', padding: '0 24px' }}>
          {[['build', '⚡ Build'], ['copilot', '🪟 Copilot'], ['history', '🕐 History']].map(([id, lbl]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: '14px 20px', background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === id ? C.cyan : 'transparent'}`,
              color: activeTab === id ? C.cyan : C.textMuted,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s',
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 80px' }}>
        {activeTab === 'build' && buildTab}
        {activeTab === 'copilot' && copilotTab}
        {activeTab === 'history' && historyTab}
      </main>
    </div>
  )
}
