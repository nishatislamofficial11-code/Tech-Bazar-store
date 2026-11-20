// Asks an AI company which models an API key can use, and picks a sensible chat model.
// (underscore prefix = not a route)

export async function listModels(provider, key) {
  let res;
  if (provider === 'anthropic') {
    res = await fetch('https://api.anthropic.com/v1/models?limit=100', { headers: { 'x-api-key': key, 'anthropic-version': '2026-10-21' } });
  } else if (provider === 'groq') {
    res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } });
  } else if (provider === 'openrouter') {
    res = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${key}` } });
  } else if (provider === 'openai') {
    res = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } });
  } else {
    res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error('API Key ভুল বা অনুমতি নেই');
    throw new Error(data?.error?.message || `HTTP ${res.status}`);
  }
  if (provider === 'anthropic') return (data?.data || []).map((m) => ({ id: m.id, name: m.display_name || m.id }));
  if (provider === 'groq') {
    return (data?.data || [])
      .filter((m) => m.active !== false && !/(whisper|tts|guard|playai|orpheus)/i.test(m.id))
      .map((m) => ({ id: m.id, name: m.id }));
  }
  if (provider === 'openrouter') {
    // Only the free models (their ids end in ':free')
    return (data?.data || []).filter((m) => /:free$/.test(m.id)).map((m) => ({ id: m.id, name: m.name || m.id }));
  }
  if (provider === 'openai') {
    return (data?.data || [])
      .map((m) => m.id)
      .filter((id) => /^(gpt|o\d|chatgpt)/i.test(id) && !/(audio|realtime|tts|transcribe|image|search|embedding|instruct)/i.test(id))
      .sort()
      .map((id) => ({ id, name: id }));
  }
  return (data?.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent') && /gemini/i.test(m.name || ''))
    .map((m) => ({ id: String(m.name).replace(/^models\//, ''), name: m.displayName || m.name }));
}

// Pick a cheap, current chat model from the live list (used when the saved model is retired)
export function pickModel(provider, models, avoid = '') {
  const ids = models.map((m) => m.id).filter((id) => id && id !== avoid);
  const bad = /(preview|exp|tts|image|vision|audio|embed|guard|whisper|learnlm|gemma|aqa|live|thinking|search|computer)/i;
  const good = ids.filter((id) => !bad.test(id));
  const first = (...tests) => {
    for (const t of tests) { const hit = good.find((id) => t.test(id)); if (hit) return hit; }
    return good[0] || ids[0] || null;
  };
  if (provider === 'google') return first(/^gemini-flash-latest$/, /^gemini-flash-lite-latest$/, /flash/);
  if (provider === 'groq') return first(/70b/, /120b/, /llama/, /qwen/);
  if (provider === 'openrouter') return first(/llama.*70b/, /gemini/, /qwen/, /deepseek/);
  if (provider === 'anthropic') return first(/haiku/, /sonnet/);
  if (provider === 'openai') return first(/^gpt-[\d.]+-mini$/, /mini/);
  return good[0] || null;
}
