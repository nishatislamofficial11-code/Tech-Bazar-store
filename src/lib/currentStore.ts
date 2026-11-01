// Determines which store this visitor is on. A store link looks like: https://site/?store=slug
const KEY = 'current_store_slug';

function detect(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get('store') || '').trim().toLowerCase();
    if (fromUrl) {
      const prev = localStorage.getItem(KEY) || '';
      if (prev !== fromUrl) {
        // Clear cached data from another store
        Object.keys(localStorage).forEach((k) => {
          if (k.includes('cache')) localStorage.removeItem(k);
        });
      }
      localStorage.setItem(KEY, fromUrl);
      return fromUrl;
    }
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export const currentStoreSlug: string = typeof window !== 'undefined' ? detect() : '';
