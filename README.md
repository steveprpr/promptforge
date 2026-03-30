# PromptForge

AI-powered prompt engineering using the RACE framework (Role, Action, Context, Expect).
Built with React + Vite, deployed on Netlify. Includes a dedicated Microsoft Copilot toolkit.

---

## Local Development

### Prerequisites
- Node.js 18+
- Netlify CLI (`npm install -g netlify-cli`)
- An Anthropic API key

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# 3. Start the dev server (Vite + Netlify Functions together)
netlify dev
```

The app runs at **http://localhost:8888**.
The function is available at `http://localhost:8888/.netlify/functions/generate-prompt`.

> `netlify dev` handles the proxy automatically — do not use `npm run dev` directly,
> as it won't wire up the serverless function.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key — never commit this |

---

## Deployment to Netlify

### First deploy

```bash
# 1. Push repo to GitHub
git init && git add . && git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/promptforge.git
git push -u origin main

# 2. Connect in Netlify dashboard
#    New site → Import from Git → select your repo

# 3. Set environment variable
#    Site → Settings → Environment Variables → Add variable
#    Key: ANTHROPIC_API_KEY  Value: sk-ant-...

# 4. Trigger deploy (or it auto-deploys on push to main)
```

Build settings (auto-detected from `netlify.toml`):
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

### Subsequent deploys

Push to `main` — Netlify deploys automatically.

---

## Project Structure

```
promptforge/
├── netlify.toml                  # Build config + function routing
├── package.json
├── vite.config.js
├── index.html                    # Google Fonts loaded here
├── src/
│   ├── main.jsx                  # React root
│   └── App.jsx                   # Full application (RACE builder, Copilot toolkit, History)
└── netlify/
    └── functions/
        └── generate-prompt.js    # Anthropic API proxy — keeps key server-side
```

## API Function

`POST /.netlify/functions/generate-prompt`

Proxies requests to the Anthropic API. Accepts:

```json
{
  "model": "claude-sonnet-4-6",
  "messages": [{ "role": "user", "content": "..." }],
  "system": "...",
  "max_tokens": 2048
}
```

Returns the raw Anthropic response. Only `claude-*` models are accepted — other models
(GPT, Gemini, Copilot) are not proxied.
