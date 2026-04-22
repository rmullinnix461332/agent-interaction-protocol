import { ipcMain } from 'electron'
import https from 'https'
import http from 'http'

interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama'
  apiKey?: string
  model: string
  endpoint?: string
}

// Default config — will be overridden by settings
let config: LLMConfig = {
  provider: 'openai',
  model: 'gpt-4o',
}

export function registerLLMHandlers() {
  ipcMain.handle('llm:configure', (_event, newConfig: LLMConfig) => {
    config = newConfig
    return true
  })

  ipcMain.handle('llm:getConfig', () => config)

  ipcMain.handle('llm:chat', async (_event, { messages, systemPrompt }: {
    messages: { role: string; content: string }[]
    systemPrompt: string
  }) => {
    try {
      switch (config.provider) {
        case 'openai':
          return await callOpenAI(systemPrompt, messages)
        case 'anthropic':
          return await callAnthropic(systemPrompt, messages)
        case 'ollama':
          return await callOllama(systemPrompt, messages)
        default:
          throw new Error(`Unknown provider: ${config.provider}`)
      }
    } catch (err: any) {
      return { error: err.message || 'LLM request failed' }
    }
  })
}

async function callOpenAI(systemPrompt: string, messages: { role: string; content: string }[]) {
  const endpoint = config.endpoint || 'https://api.openai.com'
  const body = JSON.stringify({
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.3,
  })

  const url = new URL('/v1/chat/completions', endpoint)
  return httpRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body,
  })
}

async function callAnthropic(systemPrompt: string, messages: { role: string; content: string }[]) {
  const endpoint = config.endpoint || 'https://api.anthropic.com'
  const body = JSON.stringify({
    model: config.model,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  })

  const url = new URL('/v1/messages', endpoint)
  const result = await httpRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
    },
    body,
  })

  // Normalize Anthropic response to match OpenAI shape
  if (result.content && Array.isArray(result.content)) {
    const text = result.content.map((c: any) => c.text).join('')
    return { choices: [{ message: { role: 'assistant', content: text } }] }
  }
  return result
}

async function callOllama(systemPrompt: string, messages: { role: string; content: string }[]) {
  const endpoint = config.endpoint || 'http://localhost:11434'
  const body = JSON.stringify({
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    stream: false,
  })

  const url = new URL('/api/chat', endpoint)
  const result = await httpRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  // Normalize Ollama response
  if (result.message) {
    return { choices: [{ message: result.message }] }
  }
  return result
}

function httpRequest(url: URL, opts: { method: string; headers: Record<string, string>; body: string }): Promise<any> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http
    const req = lib.request(url, {
      method: opts.method,
      headers: opts.headers,
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error(`Invalid JSON response: ${data.slice(0, 200)}`)) }
      })
    })
    req.on('error', reject)
    req.write(opts.body)
    req.end()
  })
}
