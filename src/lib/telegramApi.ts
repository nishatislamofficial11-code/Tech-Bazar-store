import { supabase } from './supabase';

export interface TelegramBotItem {
  id: string;
  name: string;
  bot_token: string;
  chat_id: string;
}

export interface TelegramConfig {
  bots: TelegramBotItem[];
  enabled?: boolean;
  botToken?: string;
  chatId?: string;
}

/**
 * Parse telegram bots from JSON string or legacy single bot fields
 */
export function parseTelegramBots(
  jsonString?: string,
  fallbackToken?: string,
  fallbackChatId?: string
): TelegramBotItem[] {
  if (jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any, idx: number) => ({
          id: item.id || `bot-${idx + 1}-${Date.now()}`,
          name: item.name || `Bot #${idx + 1}`,
          bot_token: item.bot_token || item.botToken || '',
          chat_id: item.chat_id || item.chatId || ''
        }));
      }
    } catch (e) {
      console.warn('Failed to parse telegram_bots JSON:', e);
    }
  }

  if (fallbackToken || fallbackChatId) {
    return [
      {
        id: 'bot-1',
        name: 'Main Bot',
        bot_token: fallbackToken || '',
        chat_id: fallbackChatId || ''
      }
    ];
  }

  return [
    {
      id: 'bot-1',
      name: 'Main Bot',
      bot_token: '',
      chat_id: ''
    }
  ];
}

/**
 * Fetch Telegram Settings from Supabase `settings` table
 */
export async function getTelegramConfig(): Promise<TelegramConfig | null> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['telegram_bot_token', 'telegram_chat_id', 'telegram_notifications_enabled', 'telegram_bots']);

    if (error || !data) return null;

    const settingsMap: Record<string, string> = {};
    data.forEach(item => {
      settingsMap[item.key] = item.value;
    });

    const bots = parseTelegramBots(
      settingsMap.telegram_bots,
      settingsMap.telegram_bot_token,
      settingsMap.telegram_chat_id
    );
    const enabled = settingsMap.telegram_notifications_enabled === 'true';

    return {
      bots,
      enabled,
      botToken: bots[0]?.bot_token || '',
      chatId: bots[0]?.chat_id || ''
    };
  } catch (err) {
    console.error('Error fetching Telegram config:', err);
    return null;
  }
}

/**
 * Send raw HTML message to Telegram Bot (direct with proxy fallback)
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  textHtml: string
): Promise<{ ok: boolean; error?: string }> {
  const cleanToken = botToken.trim();
  const cleanChatId = chatId.trim();
  if (!cleanToken || !cleanChatId) {
    return { ok: false, error: 'Bot Token and Chat ID are required' };
  }

  // 1. Try direct fetch to Telegram API first (works seamlessly everywhere)
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: textHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = await tgRes.json();
    if (data.ok) {
      return { ok: true };
    } else {
      return { ok: false, error: data.description || 'Failed to send Telegram message' };
    }
  } catch (directErr) {
    console.warn('Direct Telegram sendMessage fetch failed, trying proxy...', directErr);
  }

  // 2. Fallback to Admin backend proxy
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch('/api/telegram-admin', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'test',
        botToken: cleanToken,
        chatId: cleanChatId,
        text: textHtml
      })
    });

    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return { ok: false, error: 'Empty response received from server' };
    }
    const result = JSON.parse(text);
    if (!result.ok) {
      return { ok: false, error: result.error || result.description || 'Failed to send message' };
    }
    return { ok: true };
  } catch (error: any) {
    console.error('Failed to send Telegram message:', error);
    return { ok: false, error: error.message || 'Network error' };
  }
}

/**
 * Send formatted New Order Notification to Telegram
 */
export async function sendTelegramOrderNotification(orderData: {
  orderId: string;
  [key: string]: any;
}): Promise<boolean> {
  try {
    const response = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const text = await response.text();
    if (!text) return false;
    const result = JSON.parse(text);
    return Boolean(result.ok);
  } catch (err) {
    console.error('Error in sendTelegramOrderNotification via backend:', err);
    return false;
  }
}

// Escape HTML special characters for Telegram HTML mode
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Automatically fetch Chat ID from latest Telegram Bot updates (direct with proxy fallback)
 */
export async function autoFetchTelegramChatId(
  botToken: string
): Promise<{ ok: boolean; chatId?: string; error?: string }> {
  try {
    const cleanToken = botToken.trim();
    if (!cleanToken) return { ok: false, error: 'Please enter Bot Token first!' };

    // 1. Try direct fetch to Telegram API first
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getUpdates`);
      const data = await tgRes.json();
      if (data.ok && Array.isArray(data.result)) {
        if (data.result.length === 0) {
          return {
            ok: false,
            error:
              'No messages found! Please open your bot on Telegram, send /start or any message, and click Auto Fetch again.'
          };
        }

        // Search latest updates from the end
        for (let i = data.result.length - 1; i >= 0; i--) {
          const item = data.result[i];
          const foundChatId =
            item.message?.chat?.id ||
            item.channel_post?.chat?.id ||
            item.my_chat_member?.chat?.id ||
            item.callback_query?.message?.chat?.id;
          if (foundChatId) {
            return { ok: true, chatId: String(foundChatId) };
          }
        }
        return { ok: false, error: 'Could not detect Chat ID from latest messages.' };
      } else if (!data.ok) {
        return { ok: false, error: data.description || 'Invalid Telegram Bot Token!' };
      }
    } catch (directErr) {
      console.warn('Direct Telegram getUpdates fetch failed, trying proxy...', directErr);
    }

    // 2. Fallback to Admin proxy
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch('/api/telegram-admin', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'autofetch',
        botToken: cleanToken
      })
    });

    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return { ok: false, error: 'No response from proxy. Please check Bot Token.' };
    }
    const result = JSON.parse(text);
    return result;
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to connect to Telegram Admin API.' };
  }
}
