export interface SteadfastOrderPayload {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  alternative_phone?: string;
  recipient_email?: string;
  note?: string;
  item_description?: string;
  total_lot?: number;
  delivery_type?: number; // 0 = Home Delivery, 1 = Hub Pick Up
}

export interface SteadfastConfig {
  apiKey?: string;
  secretKey?: string;
  baseUrl?: string;
}

function extractErrorMessage(errData: any, fallback: string = 'Steadfast request failed'): string {
  if (typeof errData === 'string') {
    try {
      errData = JSON.parse(errData);
    } catch {
      return errData || fallback;
    }
  }
  if (!errData) return fallback;
  if (errData.message) return errData.message;
  if (errData.error) return typeof errData.error === 'string' ? errData.error : JSON.stringify(errData.error);
  if (errData.errors) {
    const errVals = Object.values(errData.errors).flat();
    if (errVals.length > 0) return String(errVals[0]);
  }
  return fallback;
}

async function callSteadfastProxy(action: string, payload?: any, config?: SteadfastConfig) {
  // 1. Try backend proxy if executed on live host or Cloudflare Pages
  try {
    const res = await fetch('/api/courier-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        courier: 'steadfast',
        action,
        payload,
        config
      })
    });

    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();

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
    if (err.message && !err.message.includes('Unexpected token') && !err.message.includes('is not valid JSON') && !err.message.includes('JSON')) {
      throw err;
    }
  }

  // Fallback for Localhost Vite Dev Server using Vite reverse proxy
  const apiKey = config?.apiKey || '';
  const secretKey = config?.secretKey || '';
  const prefix = '/api/steadfast';

  const headers: Record<string, string> = {
    'Api-Key': apiKey,
    'Secret-Key': secretKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  let url = prefix;
  let method = 'POST';
  let body: string | undefined = undefined;

  switch (action) {
    case 'get_balance':
      url += '/get_balance';
      method = 'GET';
      break;
    case 'get_status':
      url += '/' + (payload?.endpoint || '').replace(/^\//, '');
      method = 'GET';
      break;
    case 'create_order':
      url += '/create_order';
      body = JSON.stringify(payload);
      break;
    case 'bulk_create':
      url += '/create_order/bulk-order';
      body = JSON.stringify(payload);
      break;
    case 'create_return':
      url += '/create_return_request';
      body = JSON.stringify(payload);
      break;
    default:
      throw new Error(`Unsupported Steadfast action: ${action}`);
  }

  const res = await fetch(url, { method, headers, body });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, `Steadfast request failed (${res.status})`));
  }
  return data;
}

/**
 * Place a single order with Steadfast
 */
export async function createSteadfastOrder(payload: SteadfastOrderPayload, config?: SteadfastConfig) {
  const data = await callSteadfastProxy('create_order', payload, config);
  if (data.status === 200 || data.consignment) {
    return data;
  }
  throw new Error(extractErrorMessage(data, 'Steadfast Order Creation Failed'));
}

/**
 * Place bulk orders with Steadfast
 */
export async function bulkCreateSteadfastOrders(orders: SteadfastOrderPayload[], config?: SteadfastConfig) {
  const data = await callSteadfastProxy('bulk_create', { data: orders }, config);
  if (data.status === 200 || data.data) {
    return data;
  }
  throw new Error(extractErrorMessage(data, 'Steadfast Bulk Order Creation Failed'));
}

/**
 * Check delivery status by tracking code, invoice, or CID
 */
export async function getSteadfastStatus(
  identifier: string,
  type: 'trackingcode' | 'invoice' | 'cid' = 'trackingcode',
  config?: SteadfastConfig
) {
  let endpoint = `/status_by_trackingcode/${identifier}`;
  if (type === 'invoice') endpoint = `/status_by_invoice/${identifier}`;
  if (type === 'cid') endpoint = `/status_by_cid/${identifier}`;

  const data = await callSteadfastProxy('get_status', { endpoint }, config);
  return data;
}

/**
 * Check merchant account current balance
 */
export async function getSteadfastBalance(config?: SteadfastConfig) {
  const data = await callSteadfastProxy('get_balance', null, config);
  return data;
}

/**
 * Create Return Request
 */
export async function createSteadfastReturn(
  identifier: string,
  reason: string,
  config?: SteadfastConfig
) {
  const data = await callSteadfastProxy('create_return', {
    consignment_id: identifier,
    reason,
  }, config);
  return data;
}
