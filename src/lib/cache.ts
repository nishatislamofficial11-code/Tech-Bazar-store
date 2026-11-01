import { currentStoreSlug } from './currentStore';
const k = (key: string) => (currentStoreSlug ? `${currentStoreSlug}__${key}` : key);
export const getCachedData = (key: string) => {
  try {
    const item = localStorage.getItem(k(key));
    if (!item) return null;
    const { data, expiry } = JSON.parse(item);
    if (Date.now() > expiry) {
      localStorage.removeItem(k(key));
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

export const setCachedData = (key: string, data: any, ttlMin: number = 5) => {
  try {
    localStorage.setItem(k(key), JSON.stringify({
      data,
      expiry: Date.now() + ttlMin * 60 * 1000
    }));
  } catch {}
};
