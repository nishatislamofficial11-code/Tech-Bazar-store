import { supabase } from './supabase';

export interface PathaoConfig {
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  environment?: 'sandbox' | 'production';
  accessToken?: string;
}

export interface PathaoOrderPayload {
  store_id: number;
  merchant_order_id?: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_secondary_phone?: string;
  recipient_address: string;
  recipient_city?: number;
  recipient_zone?: number;
  recipient_area?: number;
  delivery_type: number; // 48 = Normal Delivery, 12 = On Demand
  item_type: number; // 1 = Document, 2 = Parcel
  special_instruction?: string;
  item_quantity: number;
  item_weight: number; // 0.5 to 10 kg
  item_description?: string;
  amount_to_collect: number;
}

function extractErrorMessage(errData: any, fallback: string = 'Connection failed'): string {
  if (typeof errData === 'string') {
    try {
      errData = JSON.parse(errData);
    } catch {
      return errData || fallback;
    }
  }
  if (!errData) return fallback;
  if (errData.error_description) return errData.error_description;
  if (errData.message) return errData.message;
  if (errData.error) return typeof errData.error === 'string' ? errData.error : JSON.stringify(errData.error);
  if (errData.errors) {
    const errVals = Object.values(errData.errors).flat();
    if (errVals.length > 0) return String(errVals[0]);
  }
  return fallback;
}

async function callPathaoProxy(action: string, payload?: any, config?: PathaoConfig, accessToken?: string) {
  // 1. Try backend proxy if executed on live host or Cloudflare Pages
  try {
    const res = await fetch('/api/courier-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        courier: 'pathao',
        action,
        payload,
        config,
        access_token: accessToken || config?.accessToken
      })
    });

    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();

    // If the server actually executed PHP/JS and returned JSON (not static Vite serving raw <?php code)
    if (
      !rawText.trim().startsWith('<?php') &&
      !rawText.trim().startsWith('<!DOCTYPE') &&
      !rawText.trim().startsWith('<html') &&
      (contentType.includes('json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('['))
    ) {
      const data = JSON.parse(rawText);
      if (res.ok) {
        return data;
      } else {
        throw new Error(extractErrorMessage(data, `HTTP ${res.status}`));
      }
    }
  } catch (err: any) {
    // If it's a real API rejection message from Pathao, throw it
    if (err.message && !err.message.includes('Unexpected token') && !err.message.includes('is not valid JSON') && !err.message.includes('JSON')) {
      throw err;
    }
  }

  // 2. Fallback for Localhost (Vite dev server) using Vite reverse proxy
  const env = config?.environment || 'sandbox';
  const prefix = env === 'production' ? '/api/pathao-prod' : '/api/pathao-sandbox';

  if (action === 'issue_token') {
    const tokenRes = await fetch(`${prefix}/aladdin/api/v1/issue-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: config?.clientId,
        client_secret: config?.clientSecret,
        username: config?.username,
        password: config?.password,
        grant_type: 'password'
      })
    });

    const data = await tokenRes.json().catch(() => null);
    if (!tokenRes.ok) {
      throw new Error(extractErrorMessage(data, `Pathao Auth Failed (${tokenRes.status})`));
    }
    return data;
  }

  const token = accessToken || config?.accessToken;
  if (!token) throw new Error('Pathao Access Token is required');

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  let url = prefix;
  let method = 'GET';
  let body: string | undefined = undefined;

  switch (action) {
    case 'get_stores':
      url += '/aladdin/api/v1/stores';
      break;
    case 'create_store':
      url += '/aladdin/api/v1/stores';
      method = 'POST';
      body = JSON.stringify(payload);
      break;
    case 'get_cities':
      url += '/aladdin/api/v1/city-list';
      break;
    case 'get_zones':
      url += `/aladdin/api/v1/cities/${payload?.city_id || 1}/zone-list`;
      break;
    case 'get_areas':
      url += `/aladdin/api/v1/zones/${payload?.zone_id || 1}/area-list`;
      break;
    case 'calculate_price':
      url += '/aladdin/api/v1/merchant/price-plan';
      method = 'POST';
      body = JSON.stringify(payload);
      break;
    case 'create_order':
      url += '/aladdin/api/v1/orders';
      method = 'POST';
      body = JSON.stringify(payload);
      break;
    case 'bulk_create':
      url += '/aladdin/api/v1/orders/bulk';
      method = 'POST';
      body = JSON.stringify(payload);
      break;
    case 'get_order_info':
      url += `/aladdin/api/v1/orders/${payload?.consignment_id}/info`;
      break;
    default:
      throw new Error(`Unsupported action: ${action}`);
  }

  const res = await fetch(url, { method, headers, body });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, `Pathao request failed (${res.status})`));
  }
  return data;
}

export async function getPathaoAccessToken(config: PathaoConfig) {
  const data = await callPathaoProxy('issue_token', null, config);
  if (data && data.access_token) {
    return data;
  }
  if (data && data.data?.access_token) {
    return data.data;
  }
  throw new Error(extractErrorMessage(data, 'Failed to obtain access token from Pathao'));
}

export async function getPathaoStores(config: PathaoConfig, accessToken?: string) {
  const data = await callPathaoProxy('get_stores', null, config, accessToken);
  if (data && data.data && Array.isArray(data.data.data)) {
    return data.data.data;
  }
  if (data && Array.isArray(data.data)) {
    return data.data;
  }
  if (data && Array.isArray(data)) {
    return data;
  }
  return [];
}

export async function createPathaoStore(storeData: any, config: PathaoConfig, accessToken?: string) {
  const data = await callPathaoProxy('create_store', storeData, config, accessToken);
  return data;
}

export async function getPathaoCities(config: PathaoConfig, accessToken?: string) {
  const data = await callPathaoProxy('get_cities', null, config, accessToken);
  if (data && data.data && Array.isArray(data.data.data)) {
    return data.data.data;
  }
  if (data && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

export async function getPathaoZones(cityId: number | string, config: PathaoConfig, accessToken?: string) {
  const data = await callPathaoProxy('get_zones', { city_id: cityId }, config, accessToken);
  if (data && data.data && Array.isArray(data.data.data)) {
    return data.data.data;
  }
  if (data && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

export async function getPathaoAreas(zoneId: number | string, config: PathaoConfig, accessToken?: string) {
  const data = await callPathaoProxy('get_areas', { zone_id: zoneId }, config, accessToken);
  if (data && data.data && Array.isArray(data.data.data)) {
    return data.data.data;
  }
  if (data && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

export async function calculatePathaoPrice(
  payload: { store_id: number; item_type: number; delivery_type: number; item_weight: number; recipient_city: number; recipient_zone: number },
  config: PathaoConfig,
  accessToken?: string
) {
  const data = await callPathaoProxy('calculate_price', payload, config, accessToken);
  return data.data || data;
}

export async function createPathaoOrder(orderPayload: PathaoOrderPayload, config: PathaoConfig, accessToken?: string) {
  const data = await callPathaoProxy('create_order', orderPayload, config, accessToken);
  return data;
}

export async function bulkCreatePathaoOrders(orders: PathaoOrderPayload[], config: PathaoConfig, accessToken?: string) {
  const data = await callPathaoProxy('bulk_create', { orders }, config, accessToken);
  return data;
}

export async function getPathaoOrderInfo(consignmentId: string, config: PathaoConfig, accessToken?: string) {
  const data = await callPathaoProxy('get_order_info', { consignment_id: consignmentId }, config, accessToken);
  return data.data || data;
}
