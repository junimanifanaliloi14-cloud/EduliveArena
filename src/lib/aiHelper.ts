export interface AIConfig {
  provider: 'gemini' | 'groq' | 'openrouter';
  apiKey: string;
}

export async function callAI(prompt: string, config: AIConfig): Promise<string> {
  if (config.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${config.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || 'Gagal memanggil Gemini.'); }
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  } 
  else if (config.provider === 'groq') {
    const url = `https://api.groq.com/openai/v1/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({ 
        model: "meta-llama/llama-4-scout-17b-16e-instruct", 
        messages: [{ role: 'user', content: prompt }], 
        temperature: 0.7 
      })
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || 'Gagal memanggil Groq.'); }
    const data = await res.json();
    return data.choices[0].message.content;
  } 
  else {
    const url = `https://openrouter.ai/api/v1/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({ 
        model: "google/gemma-4-31b-it:free", 
        messages: [{ role: 'user', content: prompt }], 
        temperature: 0.7 
      })
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || 'Gagal memanggil OpenRouter.'); }
    const data = await res.json();
    return data.choices[0].message.content;
  }
}
