import { BD_DISTRICTS, normalizeBanglaText, banglaToPhonetic, stringSimilarity, levenshteinDistance } from './bdLocationMatcher';
import { supabase } from './supabase';

export interface ParsedAddress {
  district: string;
  districtBn: string;
  thana: string;
  thanaBn: string;
  area: string;
  areaBn: string;
  cleanAddress: string;
  confidence: number;
  source: 'ai' | 'heuristic' | 'fallback';
}

export function cleanRawAddress(rawAddress: string): string {
  if (!rawAddress) return '';
  return rawAddress
    .replace(/whatsapp|imo|viber|call|note|নাম|ফোন|ঠিকানা|কুরিয়ার|ডেলিভারি/gi, '')
    .replace(/\[TID:[^\]]+\]/gi, '')
    .replace(/Name\s*:\s*[^\n]+/gi, '')
    .replace(/Phone\s*:\s*[^\n]+/gi, '')
    .replace(/Delivery\s*Area\s*:\s*[^\n]+/gi, '')
    .replace(/Address\s*:\s*/gi, '')
    .replace(/(?:\+?88)?01[3-9]\d{8}/g, '') // Remove all BD phone numbers
    .replace(/\b\d{6,14}\b/g, '') // Remove any phone/tracking numbers
    .replace(/[,\.\-\/\\#()\[\]:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Direct Client-Side AI API caller (Uses Vite proxy on localhost, direct fallback, and detailed errors)
 */
export async function callAiAddressApiDirect(
  cleanAddress: string,
  config: {
    provider: string;
    apiKey: string;
    endpointUrl?: string;
    model?: string;
    zones?: string[];
    areas?: string[];
  }
): Promise<ParsedAddress> {
  const { provider, apiKey, endpointUrl, model, zones, areas } = config;
  if (!apiKey) throw new Error('API Key is missing');

  const systemPrompt = `You are a Bangladesh postal address parser expert.
Analyze this Bangladeshi address and extract:
1. District (English & Bangla)
2. Thana / Upazila (English & Bangla)
3. Specific Area / Village / Bazaar / Union (English & Bangla)

RULES:
- NEVER include phone numbers, mobile digits, customer names, or tracking IDs!
- Return ONLY valid JSON matching this exact structure with NO markdown backticks:
{
  "district": "English District Name",
  "districtBn": "Bangla District Name",
  "thana": "English Thana Name",
  "thanaBn": "Bangla Thana Name",
  "area": "English Area Name",
  "areaBn": "Bangla Area Name",
  "cleanAddress": "Clean Address text"
}`;

  let userPrompt = `Address: ${cleanAddress}`;
  if (zones && zones.length > 0) userPrompt += `\nCandidate Zones: ${JSON.stringify(zones.slice(0, 30))}`;
  if (areas && areas.length > 0) userPrompt += `\nCandidate Areas: ${JSON.stringify(areas.slice(0, 50))}`;

  let resultJson: any = null;

  if (provider === 'gemini') {
    const geminiModel = model || 'gemini-1.5-flash';
    const urls = [
      `/api/gemini-proxy/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(apiKey)}`
    ];

    let lastError = '';
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 350 }
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          lastError = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          continue;
        }

        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        resultJson = JSON.parse(clean);
        break;
      } catch (err: any) {
        lastError = err.message || 'Network error';
      }
    }

    if (!resultJson) {
      throw new Error(`Gemini API Error: ${lastError}`);
    }
  } else if (provider === 'groq') {
    const groqModel = model || 'llama-3.3-70b-versatile';
    const urls = [
      '/api/groq/chat/completions',
      'https://api.groq.com/openai/v1/chat/completions'
    ];

    let lastError = '';
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          lastError = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          continue;
        }

        const data = await res.json();
        const rawText = data.choices?.[0]?.message?.content || '';
        resultJson = JSON.parse(rawText);
        break;
      } catch (err: any) {
        lastError = err.message || 'Network error';
      }
    }

    if (!resultJson) {
      throw new Error(`Groq API Error: ${lastError}`);
    }
  } else {
    const customUrl = endpointUrl || '/api/openai-proxy/chat/completions';
    const fallbackUrl = 'https://api.openai.com/v1/chat/completions';
    const customModel = model || 'gpt-4o-mini';

    const urls = [customUrl, fallbackUrl];
    let lastError = '';

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: customModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          lastError = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          continue;
        }

        const data = await res.json();
        const rawText = data.choices?.[0]?.message?.content || '';
        resultJson = JSON.parse(rawText);
        break;
      } catch (err: any) {
        lastError = err.message || 'Network error';
      }
    }

    if (!resultJson) {
      throw new Error(`AI API Error: ${lastError}`);
    }
  }

  if (resultJson && resultJson.district) {
    return {
      district: String(resultJson.district).replace(/\d+/g, '').trim(),
      districtBn: String(resultJson.districtBn || '').replace(/\d+/g, '').trim(),
      thana: String(resultJson.thana || '').replace(/\d+/g, '').trim() || 'Sadar',
      thanaBn: String(resultJson.thanaBn || '').replace(/\d+/g, '').trim() || 'সদর',
      area: String(resultJson.area || '').replace(/\d+/g, '').trim(),
      areaBn: String(resultJson.areaBn || '').replace(/\d+/g, '').trim(),
      cleanAddress,
      confidence: 0.99,
      source: 'ai'
    };
  }

  throw new Error('AI failed to return structured address JSON');
}

/**
 * AI Address Parser using backend proxy with direct client-side fallback
 */
export async function parseAddressWithAI(
  rawAddress: string,
  options?: {
    apiKey?: string;
    provider?: string;
    endpointUrl?: string;
    model?: string;
    zones?: string[];
    areas?: string[];
  }
): Promise<ParsedAddress> {
  const cleanInput = cleanRawAddress(rawAddress);

  // 1. Fetch AI Settings if not provided
  let provider = options?.provider || 'gemini';
  let apiKey = options?.apiKey || '';
  let endpointUrl = options?.endpointUrl || '';
  let model = options?.model || '';

  if (!apiKey) {
    try {
      const { data } = await supabase.from('settings').select('*');
      const map: any = {};
      data?.forEach(s => { map[s.key] = s.value; });

      apiKey = map.ai_parser_api_key || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
      provider = map.ai_parser_provider || provider;
      endpointUrl = map.ai_parser_endpoint || '';
      model = map.ai_parser_model || '';
    } catch (e) {}
  }

  // 2. Try Backend Proxy first
  if (apiKey) {
    try {
      const proxyRes = await fetch('/api/courier-proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courier: 'ai_parser',
          action: 'parse_address_ai',
          payload: {
            address: cleanInput,
            zones: options?.zones || [],
            areas: options?.areas || []
          },
          config: {
            provider,
            apiKey,
            endpointUrl,
            model
          }
        })
      });

      const text = await proxyRes.text();
      // If server returned valid JSON (not raw PHP script)
      if (text && !text.trim().startsWith('<?php')) {
        const resData = JSON.parse(text);
        const parsed = resData.data;

        if (parsed && parsed.district) {
          return {
            district: String(parsed.district).replace(/\d+/g, '').trim(),
            districtBn: String(parsed.districtBn || '').replace(/\d+/g, '').trim(),
            thana: String(parsed.thana || '').replace(/\d+/g, '').trim() || 'Sadar',
            thanaBn: String(parsed.thanaBn || '').replace(/\d+/g, '').trim() || 'সদর',
            area: String(parsed.area || '').replace(/\d+/g, '').trim(),
            areaBn: String(parsed.areaBn || '').replace(/\d+/g, '').trim(),
            cleanAddress: cleanInput,
            confidence: 0.99,
            source: 'ai'
          };
        }
      }
    } catch (err) {
      console.warn('Backend proxy unavailable, falling back to direct AI call:', err);
    }

    // Direct client-side call if proxy returned raw PHP text (Vite dev server)
    const directResult = await callAiAddressApiDirect(cleanInput, {
      provider,
      apiKey,
      endpointUrl,
      model,
      zones: options?.zones,
      areas: options?.areas
    });

    if (directResult) return directResult;
  }

  // 3. Fallback: High-Accuracy Heuristic & Phonetic Rule-Based Matcher
  const normalized = normalizeBanglaText(cleanInput);
  let detectedDistrict = 'Dhaka';
  let detectedDistrictBn = 'ঢাকা';
  let detectedThana = '';
  let detectedThanaBn = '';
  let detectedArea = '';
  let matchedDistrictObj: any = null;

  // Detect District
  for (const [key, d] of Object.entries(BD_DISTRICTS)) {
    if (
      normalized.includes(d.bn) ||
      normalized.includes(d.en.toLowerCase()) ||
      d.aliases.some(a => normalized.includes(a.toLowerCase()))
    ) {
      detectedDistrict = d.en;
      detectedDistrictBn = d.bn;
      matchedDistrictObj = d;
      break;
    }
  }

  // Detect Thana & Area
  if (matchedDistrictObj && matchedDistrictObj.thanas) {
    for (const t of matchedDistrictObj.thanas) {
      const isThanaMatch =
        normalized.includes(t.bn) ||
        normalized.includes(t.en.toLowerCase()) ||
        (t.aliases && t.aliases.some((a: string) => normalized.includes(a.toLowerCase())));

      if (isThanaMatch) {
        detectedThana = t.en;
        detectedThanaBn = t.bn;

        if (t.areas) {
          for (const a of t.areas) {
            if (normalized.includes(a.toLowerCase())) {
              detectedArea = a;
              break;
            }
          }
        }
        break;
      }
    }
  }

  return {
    district: detectedDistrict,
    districtBn: detectedDistrictBn,
    thana: detectedThana || 'Sadar',
    thanaBn: detectedThanaBn || 'সদর',
    area: detectedArea,
    areaBn: detectedArea,
    cleanAddress: cleanInput,
    confidence: detectedThana ? 0.90 : 0.60,
    source: 'heuristic'
  };
}
