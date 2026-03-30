// OpenRouter API proxy — keeps OPENROUTER_API_KEY server-side
// OpenRouter uses the OpenAI-compatible chat completions format.
// Docs: https://openrouter.ai/docs

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'OPENROUTER_API_KEY environment variable is not set' }) }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON in request body' }) }
  }

  const { system, messages, model, max_tokens } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'messages array is required' }) }
  }

  if (!model) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'model is required' }) }
  }

  // OpenRouter uses OpenAI format: system prompt goes as first message with role "system"
  const fullMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages

  let response
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://promptforge.netlify.app',
        'X-Title': 'PromptForge',
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        max_tokens: max_tokens ?? 2048,
      }),
    })
  } catch (err) {
    return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Failed to reach OpenRouter API', detail: err.message }) }
  }

  const data = await response.json()

  if (!response.ok) {
    return {
      statusCode: response.status,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: data?.error?.message ?? 'OpenRouter API error' }),
    }
  }

  // Normalize to the shape the frontend expects: data.content[0].text
  // OpenRouter returns: data.choices[0].message.content
  const normalized = {
    ...data,
    content: [{ type: 'text', text: data.choices?.[0]?.message?.content ?? '' }],
  }

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(normalized) }
}
