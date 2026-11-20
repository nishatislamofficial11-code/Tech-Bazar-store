import { supabase } from './supabase';
import { currentStoreSlug } from './currentStore';

export type AiStatus = 'ai' | 'needs_human' | 'assigned' | 'resolved';

export interface AiConversation {
  id: string;
  channel: 'test' | 'website' | 'messenger' | 'instagram' | 'whatsapp';
  customer_name: string | null;
  customer_phone: string | null;
  status: AiStatus;
  ai_paused: boolean;
  assigned_to: string | null;
  assigned_name: string | null;
  handoff_reason: string | null;
  summary: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  unread: number;
  last_message: string | null;
  last_message_at: string;
}

export interface ProductCard { type: 'product'; title: string; price: number; image: string | null; path: string }

export interface AiMessage {
  id: string;
  attachments?: ProductCard[] | null;
  role: 'customer' | 'ai' | 'agent' | 'system';
  content: string;
  agent_name: string | null;
  created_at: string;
}

/** Calls the server AI endpoint as the logged-in shop staff member. */
export async function aiChatApi<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
    body: JSON.stringify({ store: currentStoreSlug, ...body }),
  });
  const out = await res.json().catch(() => null);
  if (!res.ok || !out?.ok) throw new Error(out?.error || `সমস্যা হয়েছে (HTTP ${res.status})`);
  return out as T;
}

export const CHANNEL_LABEL: Record<AiConversation['channel'], string> = {
  test: 'Test', website: 'Website', messenger: 'Messenger', instagram: 'Instagram', whatsapp: 'WhatsApp',
};
export const CHANNEL_STYLE: Record<AiConversation['channel'], string> = {
  test: 'bg-slate-100 text-slate-600',
  website: 'bg-violet-50 text-violet-600',
  messenger: 'bg-blue-50 text-blue-600',
  instagram: 'bg-pink-50 text-pink-600',
  whatsapp: 'bg-emerald-50 text-emerald-600',
};
