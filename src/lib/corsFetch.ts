/**
 * CORS-safe fetch helper that falls back to proxy endpoints if direct browser fetch fails due to CORS.
 */

export async function corsFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    // 1. Direct fetch
    const res = await fetch(url, options);
    return res;
  } catch (err: any) {
    const isCorsError =
      err instanceof TypeError ||
      (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('CORS')));

    if (isCorsError) {
      console.warn(`[corsFetch] Direct fetch to ${url} failed due to CORS. Attempting CORS proxies...`);

      // 2. Try Vite proxy if URL matches known hosts
      let viteProxyUrl = '';
      if (url.includes('courier-api-sandbox.pathao.com')) {
        viteProxyUrl = url.replace('https://courier-api-sandbox.pathao.com', '/api/pathao-sandbox');
      } else if (url.includes('api-hermes.pathao.com')) {
        viteProxyUrl = url.replace('https://api-hermes.pathao.com', '/api/pathao-prod');
      } else if (url.includes('api.pathao.com')) {
        viteProxyUrl = url.replace('https://api.pathao.com', '/api/pathao-prod');
      } else if (url.includes('courier-api.pathao.com')) {
        viteProxyUrl = url.replace('https://courier-api.pathao.com', '/api/pathao-prod');
      } else if (url.includes('portal.packzy.com/api/v1')) {
        viteProxyUrl = url.replace('https://portal.packzy.com/api/v1', '/api/steadfast');
      }

      if (viteProxyUrl) {
        try {
          const viteRes = await fetch(viteProxyUrl, options);
          return viteRes;
        } catch (viteErr) {
          console.warn(`[corsFetch] Vite proxy failed for ${viteProxyUrl}, trying public CORS proxies...`);
        }
      }

      throw new Error('Direct browser call blocked by CORS policy. Please dispatch orders via internal server proxy.');
    }

    throw err;
  }
}
