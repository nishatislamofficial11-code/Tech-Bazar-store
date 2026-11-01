export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Api-Key, Secret-Key, Accept',
      },
    });
  }

  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const bodyText = await context.request.text();
    let bodyJson = {};
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const { courier, action, payload, config, access_token } = bodyJson;

    // 1. STEADFAST PROXY
    if (courier === 'steadfast') {
      const apiKey = (config?.apiKey || config?.api_key || '').trim();
      const secretKey = (config?.secretKey || config?.secret_key || '').trim();
      const baseUrl = (config?.baseUrl || config?.base_url || 'https://portal.packzy.com/api/v1').trim().replace(/\/$/, '');

      if (!apiKey || !secretKey) {
        return new Response(JSON.stringify({ error: 'Steadfast Api-Key and Secret-Key are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const headers = {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      let targetUrl = baseUrl;
      let method = 'POST';
      let requestBody = null;

      switch (action) {
        case 'create_order':
          targetUrl += '/create_order';
          requestBody = JSON.stringify(payload);
          break;
        case 'bulk_create':
          targetUrl += '/create_order/bulk-order';
          requestBody = JSON.stringify(payload);
          break;
        case 'get_status':
          targetUrl += '/' + (payload?.endpoint || '').replace(/^\//, '');
          method = 'GET';
          break;
        case 'get_balance':
          targetUrl += '/get_balance';
          method = 'GET';
          break;
        case 'create_return':
          targetUrl += '/create_return_request';
          requestBody = JSON.stringify(payload);
          break;
        default:
          return new Response(JSON.stringify({ error: `Unsupported Steadfast action: ${action}` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
      }

      const courierRes = await fetch(targetUrl, {
        method,
        headers,
        body: requestBody
      });

      const responseText = await courierRes.text();
      return new Response(responseText, {
        status: courierRes.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 2. PATHAO PROXY
    if (courier === 'pathao') {
      const env = config?.environment || 'sandbox';
      const baseUrl = env === 'production' ? 'https://api-hermes.pathao.com' : 'https://courier-api-sandbox.pathao.com';
      const clientId = (config?.clientId || config?.client_id || '').trim();
      const clientSecret = (config?.clientSecret || config?.client_secret || '').trim();
      const username = (config?.username || '').trim();
      const password = (config?.password || '').trim();

      // Issue token action or direct token retrieval
      if (action === 'issue_token' || action === 'get_token') {
        const tokenRes = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            username: username,
            password: password,
            grant_type: 'password'
          })
        });
        const tokenText = await tokenRes.text();
        return new Response(tokenText, {
          status: tokenRes.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      let activeToken = access_token || config?.accessToken || '';

      // If token not provided directly, issue it on the fly
      if (!activeToken && clientId && clientSecret && username && password) {
        const autoTokenRes = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            username: username,
            password: password,
            grant_type: 'password'
          })
        });
        const autoTokenData = await autoTokenRes.json();
        activeToken = autoTokenData?.access_token || autoTokenData?.data?.access_token || '';
      }

      if (!activeToken) {
        return new Response(JSON.stringify({ error: 'Pathao access token could not be obtained' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const pathaoHeaders = {
        'Authorization': `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      let targetUrl = baseUrl;
      let method = 'POST';
      let requestBody = null;

      switch (action) {
        case 'get_stores':
          targetUrl += '/aladdin/api/v1/stores';
          method = 'GET';
          break;
        case 'get_cities':
          targetUrl += '/aladdin/api/v1/countries/1/city-list';
          method = 'GET';
          break;
        case 'get_zones':
          targetUrl += `/aladdin/api/v1/cities/${payload?.city_id}/zone-list`;
          method = 'GET';
          break;
        case 'get_areas':
          targetUrl += `/aladdin/api/v1/zones/${payload?.zone_id}/area-list`;
          method = 'GET';
          break;
        case 'calculate_price':
          targetUrl += '/aladdin/api/v1/merchant/price-plan';
          requestBody = JSON.stringify(payload);
          break;
        case 'create_order':
          targetUrl += '/aladdin/api/v1/orders';
          requestBody = JSON.stringify(payload);
          break;
        case 'create_store':
          targetUrl += '/aladdin/api/v1/stores';
          requestBody = JSON.stringify(payload);
          break;
        case 'bulk_create':
          targetUrl += '/aladdin/api/v1/orders/bulk';
          requestBody = JSON.stringify(payload);
          break;
        case 'get_order_info':
          targetUrl += `/aladdin/api/v1/orders/${payload?.consignment_id}/info`;
          method = 'GET';
          break;
        default:
          return new Response(JSON.stringify({ error: `Unsupported Pathao action: ${action}` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
      }

      const pathaoRes = await fetch(targetUrl, {
        method,
        headers: pathaoHeaders,
        body: requestBody
      });

      const responseText = await pathaoRes.text();
      return new Response(responseText, {
        status: pathaoRes.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({ error: `Invalid courier type: ${courier}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('Courier proxy edge error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Courier proxy failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
