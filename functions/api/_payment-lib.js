// Shared payment helpers for Pages Functions (underscore prefix = not a route).

export function money(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error('টাকার পরিমাণ সঠিক নয়');
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function validateSettlement(payment, verified) {
  return verified.successful &&
    payment.transaction === verified.transaction &&
    payment.store === verified.store &&
    payment.currency === verified.currency &&
    money(payment.amount) === money(verified.amount);
}

// Short numeric id sent to the gateway for one payment session (SSLCommerz allows max 30 chars).
export function newAttemptId() {
  const rand = new Uint32Array(2);
  crypto.getRandomValues(rand);
  return `${Date.now()}${String(rand[0] % 10000000).padStart(7, '0')}`;
}
export const isAttemptId = (value) => /^[0-9]{12,30}$/.test(String(value || ''));
export const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));

// Fields each gateway needs, as stored in store_payment_gateways.credentials
export const REQUIRED_CREDENTIALS = {
  sslcommerz: ['store_id', 'password'],
  aamarpay: ['store_id', 'password'],
  eps: ['username', 'password', 'hash_key', 'merchant_id', 'store_id'],
};
export function missingCredentials(gateway, c) {
  return (REQUIRED_CREDENTIALS[gateway] || []).filter((k) => !String(c?.[k] || '').trim());
}

// EPS signs every request: x-hash = Base64(HMAC-SHA512(hash_key, value))
async function epsHash(hashKey, value) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(hashKey), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(String(value))));
  let bin = '';
  for (const b of sig) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function epsToken(config) {
  const c = config.credentials;
  const data = await postJson(`${epsBase(config.environment)}/Auth/GetToken`,
    { userName: c.username, password: c.password },
    { 'x-hash': await epsHash(c.hash_key, c.username) });
  const token = data?.token || data?.Token;
  if (!token) throw new Error(`EPS প্রমাণীকরণ ব্যর্থ${data?.errorMessage ? `: ${data.errorMessage}` : ''}`);
  return token;
}

const sslBase = (env) => env === 'live' ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';
const epsBase = (env) => env === 'live' ? 'https://pgapi.eps.com.bd/v1' : 'https://sandboxpgapi.eps.com.bd/v1';
const aamarBase = (env) => env === 'live' ? 'https://secure.aamarpay.com' : 'https://sandbox.aamarpay.com';

async function postForm(url, fields) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
  });
  if (!res.ok) throw new Error(`গেটওয়ে সংযোগ ব্যর্থ (${res.status})`);
  return res.json();
}

async function postJson(url, payload, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`গেটওয়ে সংযোগ ব্যর্থ (${res.status})`);
  return res.json();
}

export async function initiatePayment(config, input) {
  const amount = money(input.amount);
  if (amount <= 0) throw new Error('পেমেন্টের পরিমাণ শূন্য হতে পারে না');
  const cb = `${input.callbackBase}?gateway=${config.gateway}`;
  const c = config.credentials;
  const tranId = input.transactionId;
  if (!isAttemptId(tranId)) throw new Error('লেনদেন আইডি সঠিক নয়');
  const missing = missingCredentials(config.gateway, c);
  if (missing.length) throw new Error(`গেটওয়ের তথ্য অসম্পূর্ণ: ${missing.join(', ')}`);

  if (config.gateway === 'sslcommerz') {
    const data = await postForm(`${sslBase(config.environment)}/gwprocess/v4/api.php`, {
      store_id: c.store_id,
      store_passwd: c.password,
      total_amount: amount.toFixed(2),
      currency: input.currency || 'BDT',
      tran_id: tranId,
      success_url: `${cb}&status=success`,
      fail_url: `${cb}&status=failed`,
      cancel_url: `${cb}&status=cancelled`,
      ipn_url: `${cb}&status=ipn`,
      cus_name: input.customerName,
      cus_phone: input.customerPhone,
      cus_add1: input.customerAddress,
      cus_email: 'customer@example.com',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: input.productName.slice(0, 200),
      product_category: 'Ecommerce',
      product_profile: 'general',
    });
    if (data?.status !== 'SUCCESS' || !data?.GatewayPageURL) {
      throw new Error(data?.failedreason || 'SSLCommerz সেশন তৈরি হয়নি');
    }
    return { redirectUrl: data.GatewayPageURL };
  }

  if (config.gateway === 'aamarpay') {
    const data = await postJson(`${aamarBase(config.environment)}/jsonpost.php`, {
      store_id: c.store_id,
      signature_key: c.password,
      tran_id: tranId,
      success_url: `${cb}&status=success`,
      fail_url: `${cb}&status=failed`,
      cancel_url: `${cb}&status=cancelled`,
      amount: amount.toFixed(2),
      currency: input.currency || 'BDT',
      desc: input.productName.slice(0, 200),
      cus_name: input.customerName,
      cus_phone: input.customerPhone,
      cus_add1: input.customerAddress,
      cus_email: 'customer@example.com',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      opt_a: input.orderId,
      type: 'json',
    });
    if (String(data?.result) !== 'true' || !data?.payment_url) throw new Error(`aamarPay সেশন তৈরি হয়নি${typeof data === 'string' ? `: ${data}` : ''}`);
    return { redirectUrl: data.payment_url };
  }

  // EPS
  const token = await epsToken(config);
  const data = await postJson(
    `${epsBase(config.environment)}/EPSEngine/InitializeEPS`,
    {
      merchantId: c.merchant_id,
      storeId: c.store_id,
      CustomerOrderId: input.orderId,
      merchantTransactionId: tranId,
      transactionTypeId: 1,
      totalAmount: amount,
      successUrl: `${cb}&status=success`,
      failUrl: `${cb}&status=failed`,
      cancelUrl: `${cb}&status=cancelled`,
      customerName: input.customerName,
      customerEmail: 'customer@example.com',
      CustomerAddress: input.customerAddress,
      CustomerCity: 'Dhaka',
      CustomerState: 'Dhaka',
      CustomerPostcode: '1000',
      CustomerCountry: 'BD',
      CustomerPhone: input.customerPhone,
      ProductName: input.productName.slice(0, 200),
      NoOfItem: 1,
      ProductProfile: 'general',
      ProductCategory: 'Ecommerce',
    },
    { Authorization: `Bearer ${token}`, 'x-hash': await epsHash(c.hash_key, tranId) },
  );
  const redirectUrl = data?.RedirectURL || data?.redirectUrl;
  if (!redirectUrl) throw new Error(`EPS সেশন তৈরি হয়নি${data?.ErrorMessage ? `: ${data.ErrorMessage}` : ''}`);
  return { redirectUrl };
}

export async function verifyPayment(config, params) {
  const c = config.credentials;

  if (config.gateway === 'sslcommerz') {
    const valId = params['val_id'];
    if (!valId) throw new Error('val_id missing');
    const data = await postForm(`${sslBase(config.environment)}/validator/api/validationserverAPI.php`, {
      val_id: valId,
      store_id: c.store_id,
      store_passwd: c.password,
      format: 'json',
    });
    const ok = data?.status === 'VALID' || data?.status === 'VALIDATED';
    return {
      successful: ok,
      transaction: String(data?.tran_id || params['tran_id'] || ''),
      amount: money(Number(data?.amount || 0)),
      currency: String(data?.currency || 'BDT'),
      gatewayTransactionId: String(data?.bank_tran_id || valId),
    };
  }

  if (config.gateway === 'aamarpay') {
    const trxId = params['mer_txnid'] || params['tran_id'] || '';
    const requestId = params['request_id'] || trxId;
    const url = `${aamarBase(config.environment)}/api/v1/trxcheck/request.php?request_id=${encodeURIComponent(requestId)}&store_id=${encodeURIComponent(c.store_id)}&signature_key=${encodeURIComponent(c.password)}&type=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('aamarPay যাচাই ব্যর্থ');
    const data = await res.json();
    const ok = data?.pay_status === 'Successful' || data?.status_code === '2' || data?.status === 'Successful';
    return {
      successful: ok,
      transaction: String(data?.mer_txnid || trxId),
      amount: money(Number(data?.amount || 0)),
      currency: String(data?.currency || 'BDT'),
      gatewayTransactionId: String(data?.pg_txnid || requestId),
    };
  }

  // EPS
  const merchantTrx = params['MerchantTransactionId'] || params['merchantTransactionId'] || '';
  if (!isAttemptId(merchantTrx)) throw new Error('EPS লেনদেন আইডি সঠিক নয়');
  const token = await epsToken(config);
  const res = await fetch(
    `${epsBase(config.environment)}/EPSEngine/CheckMerchantTransactionStatus?merchantTransactionId=${encodeURIComponent(merchantTrx)}`,
    { headers: { Authorization: `Bearer ${token}`, 'x-hash': await epsHash(c.hash_key, merchantTrx) } },
  );
  if (!res.ok) throw new Error('EPS যাচাই ব্যর্থ');
  const data = await res.json();
  const ok = data?.Status === 'Success' || data?.status === 'Success';
  return {
    successful: ok,
    transaction: String(data?.MerchantTransactionId || merchantTrx),
    amount: money(Number(data?.TotalAmount || data?.totalAmount || 0)),
    currency: 'BDT',
    gatewayTransactionId: String(data?.EpsTransactionId || merchantTrx),
  };
}
