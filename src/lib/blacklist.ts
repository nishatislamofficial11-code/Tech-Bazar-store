import { supabase } from './supabase';

export interface BlacklistedUser {
  id: string;
  phone: string;
  ip?: string;
  deviceId?: string;
  strictIp?: boolean;
  reason?: string;
  addedAt: string;
}

export interface BlockCheckResult {
  isBlocked: boolean;
  blockedType?: 'phone' | 'ip' | 'device' | 'both';
  reason?: string;
}

// Generate or retrieve persistent Device ID (stored in localStorage + cookie for persistence across storage clears)
export const getPersistentDeviceId = (): string => {
  try {
    let devId = localStorage.getItem('_bd_dev_id');
    if (!devId) {
      const match = document.cookie.match(/(?:^|; )_bd_dev_id=([^;]*)/);
      if (match && match[1]) {
        devId = decodeURIComponent(match[1]);
      }
    }
    if (!devId) {
      devId = 'dev_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12) + Date.now().toString(36));
    }
    localStorage.setItem('_bd_dev_id', devId);
    document.cookie = `_bd_dev_id=${encodeURIComponent(devId)}; max-age=315360000; path=/; SameSite=Lax`;
    return devId;
  } catch {
    return 'dev_unknown';
  }
};

// Canvas and hardware signature to construct composite device fingerprint
export const getDeviceFingerprint = (): string => {
  try {
    const devId = getPersistentDeviceId();
    let canvasHash = 'c0';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = '#f60';
        ctx.fillRect(100, 1, 50, 18);
        ctx.fillStyle = '#069';
        ctx.fillText('StoreFP_Canvas', 2, 10);
        const dataUrl = canvas.toDataURL();
        let hash = 0;
        for (let i = 0; i < dataUrl.length; i++) {
          hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
          hash |= 0;
        }
        canvasHash = Math.abs(hash).toString(36);
      }
    } catch {}

    const screenInfo = typeof window !== 'undefined' && window.screen ? `${window.screen.width}x${window.screen.height}` : 'unknown';
    const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
    return `${devId}__fp_${canvasHash}_${screenInfo}_${tz}`.replace(/\s+/g, '_');
  } catch {
    return getPersistentDeviceId();
  }
};

// Check if this device has an active browser lockdown
export const isDeviceLockedDown = (): boolean => {
  try {
    if (localStorage.getItem('sys_client_blocked')) return true;
    const match = document.cookie.match(/(?:^|; )_bd_dev_locked=([^;]*)/);
    if (match && match[1] === 'true') return true;
  } catch {}
  return false;
};

// Apply persistent device lockdown
export const setDeviceLockdown = (payload: { ip?: string; phone?: string; reason?: string }) => {
  try {
    const data = {
      isBlocked: true,
      ip: payload.ip,
      phone: payload.phone,
      reason: payload.reason || 'Access restricted',
      timestamp: Date.now()
    };
    localStorage.setItem('sys_client_blocked', JSON.stringify(data));
    document.cookie = `_bd_dev_locked=true; max-age=31536000; path=/; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent('client_blocked', { detail: data }));
  } catch {}
};

export const banglaToEnglishDigits = (str: string): string => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return (str || '').replace(/[০-৯]/g, d => String(banglaDigits.indexOf(d)));
};

// Normalize phone to last 10 digits for robust matching (+88017..., 88017..., 017..., Bangla digits)
export const normalizePhoneForMatch = (phone: string): string => {
  const converted = banglaToEnglishDigits(phone || '');
  const digits = converted.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10); // Matches last 10 digits regardless of prefix
  }
  return digits;
};

export const getBlacklist = async (): Promise<BlacklistedUser[]> => {
  try {
    // 1. Primary: Load from public-readable pages table
    const { data: pageData } = await supabase
      .from('pages')
      .select('content')
      .eq('slug', '__system_fraud_blacklist')
      .maybeSingle();

    if (pageData?.content) {
      try {
        const parsed = JSON.parse(pageData.content);
        if (Array.isArray(parsed)) return parsed as BlacklistedUser[];
      } catch (e) {}
    }

    // 2. Fallback: Load from settings table (accessible when logged in as admin)
    const { data: settingsData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'fraud_blacklist')
      .maybeSingle();

    if (settingsData?.value) {
      try {
        const parsed = JSON.parse(settingsData.value);
        if (Array.isArray(parsed)) return parsed as BlacklistedUser[];
      } catch (e) {}
    }

    return [];
  } catch (err) {
    console.error('Error fetching blacklist:', err);
    return [];
  }
};

const saveBlacklistToDb = async (list: BlacklistedUser[]) => {
  const jsonStr = JSON.stringify(list);

  // 1. Save to pages table (publicly accessible read)
  try {
    const { data: existingPage } = await supabase
      .from('pages')
      .select('id')
      .eq('slug', '__system_fraud_blacklist')
      .maybeSingle();

    if (existingPage) {
      await supabase
        .from('pages')
        .update({ content: jsonStr, updated_at: new Date().toISOString() })
        .eq('slug', '__system_fraud_blacklist');
    } else {
      await supabase
        .from('pages')
        .insert([{
          slug: '__system_fraud_blacklist',
          title: 'System Blacklist',
          content: jsonStr
        }]);
    }
  } catch (err) {
    console.warn('Failed to save blacklist to pages:', err);
  }

  // 2. Save to settings table for backup
  try {
    const { data: existingSetting } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'fraud_blacklist')
      .maybeSingle();

    if (existingSetting) {
      await supabase
        .from('settings')
        .update({ value: jsonStr, updated_at: new Date().toISOString() })
        .eq('key', 'fraud_blacklist');
    } else {
      await supabase
        .from('settings')
        .insert([{ key: 'fraud_blacklist', value: jsonStr }]);
    }
  } catch (err) {
    console.warn('Failed to save blacklist to settings:', err);
  }
};

export const addToBlacklist = async (
  phone: string,
  ip?: string,
  reason?: string,
  options?: { deviceId?: string; strictIp?: boolean }
) => {
  const list = await getBlacklist();
  const rawPhone = (phone || '').replace(/\D/g, '');
  const validIp = ip && ip !== 'Unknown' && ip !== 'N/A' ? ip.trim() : undefined;
  const devId = options?.deviceId || getPersistentDeviceId();
  
  if (!rawPhone && !validIp && !devId) return;

  const matchPhone = normalizePhoneForMatch(rawPhone);
  const existingIndex = list.findIndex(item => 
    (matchPhone && normalizePhoneForMatch(item.phone) === matchPhone) || 
    (validIp && item.ip && item.ip === validIp && (options?.strictIp || item.strictIp)) ||
    (devId && item.deviceId && (item.deviceId === devId || devId.startsWith(item.deviceId)))
  );
  
  if (existingIndex >= 0) {
    if (validIp) list[existingIndex].ip = validIp;
    if (rawPhone) list[existingIndex].phone = rawPhone;
    if (devId) list[existingIndex].deviceId = devId;
    if (options?.strictIp !== undefined) list[existingIndex].strictIp = options.strictIp;
    if (reason !== undefined) list[existingIndex].reason = reason;
  } else {
    list.unshift({
      id: Math.random().toString(36).substring(2, 9),
      phone: rawPhone,
      ip: validIp,
      deviceId: devId,
      strictIp: options?.strictIp || false,
      reason,
      addedAt: new Date().toISOString()
    });
  }
  
  await saveBlacklistToDb(list);
};

export const removeFromBlacklist = async (id: string) => {
  const list = await getBlacklist();
  const newList = list.filter(item => item.id !== id);
  await saveBlacklistToDb(newList);
};

export const trapBlacklistIp = async (phone: string, ip?: string, reason?: string) => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  let targetIp = ip && ip !== 'Unknown' && ip !== 'N/A' ? ip.trim() : '';
  if (!targetIp) {
    try {
      targetIp = await fetchClientIp();
    } catch (e) {}
  }
  const currentDeviceId = getPersistentDeviceId();
  const compositeFingerprint = getDeviceFingerprint();

  // Set local browser lockdown immediately on the attacker's device
  setDeviceLockdown({ ip: targetIp, phone: cleanPhone, reason });

  // 1. Send to serverless API trap (uses SERVICE ROLE KEY to update Supabase)
  try {
    const res = await fetch('/api/blacklist-trap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        ip: targetIp,
        deviceId: currentDeviceId,
        fingerprint: compositeFingerprint,
        reason: reason || 'Auto-trapped device on fraud attempt'
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('API trap call error:', e);
  }

  // 2. Direct client fallback (if admin session active)
  try {
    await addToBlacklist(cleanPhone, targetIp, reason || 'Auto-trapped device on fraud attempt', {
      deviceId: currentDeviceId
    });
  } catch (e) {}
};

export const checkIsBlocked = async (ip: string, phone: string, autoTrap: boolean = true): Promise<BlockCheckResult> => {
  try {
    // 1. Instant Device Lockdown Check (browser storage/cookie level)
    if (isDeviceLockedDown()) {
      return {
        isBlocked: true,
        blockedType: 'device',
        reason: 'এই ডিভাইসটি পূর্বে স্থগিত করা হয়েছে।'
      };
    }

    const currentDeviceId = getPersistentDeviceId();
    let cleanIp = ip && ip !== 'Unknown' && ip !== 'N/A' ? ip.trim() : '';
    if (!cleanIp && phone) {
      cleanIp = await fetchClientIp();
    }

    const list = await getBlacklist();
    if (!list || list.length === 0) return { isBlocked: false };

    const normPhone = normalizePhoneForMatch(phone);

    for (const item of list) {
      const itemPhoneNorm = normalizePhoneForMatch(item.phone);
      const phoneMatches = Boolean(normPhone && itemPhoneNorm && normPhone === itemPhoneNorm);
      const deviceMatches = Boolean(
        currentDeviceId && item.deviceId && (
          item.deviceId === currentDeviceId || 
          currentDeviceId.includes(item.deviceId) || 
          item.deviceId.includes(currentDeviceId)
        )
      );

      // A. Phone number match: Gold standard in BD (SIM card bound)
      if (phoneMatches) {
        if (autoTrap) {
          trapBlacklistIp(phone, cleanIp, item.reason).catch(() => {});
        }
        return { isBlocked: true, blockedType: 'phone', reason: item.reason };
      }

      // B. Device Fingerprint match: Stops fraudster even if they change SIM or toggle airplane mode
      if (deviceMatches) {
        if (autoTrap) {
          setDeviceLockdown({ ip: cleanIp, phone, reason: item.reason });
        }
        return { isBlocked: true, blockedType: 'device', reason: item.reason };
      }

      // C. IP matching (BANGLADESH CGNAT SAFEGUARD):
      // If phone is NOT entered yet, DO NOT block on IP alone unless strictIp is explicitly configured!
      // In Bangladesh, mobile operators (GP, Banglalink, Robi) & local ISPs share single public IPs
      // across thousands of users via CGNAT. Blocking on shared IP without phone/device blocks innocent users!
      if (cleanIp && item.ip) {
        const itemIp = item.ip.trim();
        const ipMatches = (cleanIp === itemIp) || (itemIp.endsWith('*') && cleanIp.startsWith(itemIp.slice(0, -1)));
        
        if (ipMatches && item.strictIp) {
          return { isBlocked: true, blockedType: 'ip', reason: item.reason };
        }
      }
    }
  } catch (err) {
    console.error('Error checking blacklist:', err);
  }

  return { isBlocked: false };
};

let cachedIp: string | null = null;

export const fetchClientIp = async (): Promise<string> => {
  if (cachedIp && cachedIp !== 'Unknown') return cachedIp;

  try {
    const session = sessionStorage.getItem('client_cached_ip');
    if (session && session !== 'Unknown') {
      cachedIp = session;
      return session;
    }
  } catch (e) {}

  // Multi-provider fetch for 100% guarantee across adblockers & firewalls
  const providers = [
    async () => {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip ? String(data.ip).trim() : null;
    },
    async () => {
      const res = await fetch('https://api64.ipify.org?format=json');
      const data = await res.json();
      return data.ip ? String(data.ip).trim() : null;
    },
    async () => {
      const res = await fetch('https://icanhazip.com');
      const text = await res.text();
      return text && text.trim() ? text.trim() : null;
    }
  ];

  for (const provider of providers) {
    try {
      const ip = await provider();
      if (ip && ip.length >= 7) {
        cachedIp = ip;
        try { sessionStorage.setItem('client_cached_ip', ip); } catch (e) {}
        return ip;
      }
    } catch (e) {}
  }

  return 'Unknown';
};
