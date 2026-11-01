/**
 * Courier Live Webhook Receiver for Cloudflare Pages (Steadfast & Pathao)
 */
export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ status: 'error', message: 'Method not allowed' }), { status: 405 });
  }

  try {
    const payload = await context.request.json().catch(() => null);
    if (!payload) {
      return new Response(JSON.stringify({ status: 'error', message: 'Invalid JSON payload' }), { status: 400 });
    }

    let courierName = null;
    let consignmentId = null;
    let status = null;

    if (payload.consignment_id && payload.status) {
      courierName = 'steadfast';
      consignmentId = String(payload.consignment_id);
      status = String(payload.status).toLowerCase();
    } else if (payload.consignment_id && (payload.order_status || payload.status)) {
      courierName = 'pathao';
      consignmentId = String(payload.consignment_id);
      status = String(payload.order_status || payload.status).toLowerCase();
    }

    return new Response(JSON.stringify({
      status: 'success',
      courier: courierName,
      consignment_id: consignmentId,
      courier_status: status
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: err.message }), { status: 500 });
  }
}
