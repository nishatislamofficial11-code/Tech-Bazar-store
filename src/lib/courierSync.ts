/**
 * Courier Live Status Auto-Sync Helper
 * Automatically checks and updates delivery statuses from Steadfast & Pathao APIs.
 */

import { supabase } from './supabase';
import { getSteadfastStatus, SteadfastConfig } from './steadfastApi';
import { getPathaoAccessToken, getPathaoOrderInfo, PathaoConfig } from './pathaoApi';

export async function syncAllDispatchedOrders(): Promise<{ updated: number; checked: number }> {
  try {
    // 1. Fetch settings
    const { data: settingsData } = await supabase.from('settings').select('*');
    const settingsMap: any = {};
    settingsData?.forEach(s => { settingsMap[s.key] = s.value; });

    // 2. Fetch dispatched orders that are not yet delivered/cancelled
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('*')
      .not('courier_name', 'is', null)
      .not('status', 'in', '("delivered","cancelled")');

    if (!activeOrders || activeOrders.length === 0) {
      return { updated: 0, checked: 0 };
    }

    let updatedCount = 0;

    // Configs
    const steadfastConfig: SteadfastConfig = {
      apiKey: settingsMap.steadfast_api_key || '',
      secretKey: settingsMap.steadfast_secret_key || '',
      baseUrl: settingsMap.steadfast_base_url || 'https://portal.packzy.com/api/v1',
    };

    const pathaoConfig: PathaoConfig = {
      clientId: settingsMap.pathao_client_id || '',
      clientSecret: settingsMap.pathao_client_secret || '',
      username: settingsMap.pathao_username || '',
      password: settingsMap.pathao_password || '',
      environment: settingsMap.pathao_environment || 'sandbox',
    };

    let pathaoToken = '';
    if (pathaoConfig.clientId && pathaoConfig.clientSecret) {
      try {
        const tokenRes = await getPathaoAccessToken(pathaoConfig);
        pathaoToken = tokenRes.access_token;
      } catch (e) {
        console.warn('Pathao token failed during auto-sync:', e);
      }
    }

    for (const order of activeOrders) {
      if (order.courier_name === 'steadfast' && (order.courier_tracking_code || order.courier_consignment_id)) {
        try {
          const tracker = order.courier_tracking_code || order.courier_consignment_id;
          const statusRes = await getSteadfastStatus(tracker, 'trackingcode', steadfastConfig);

          if (statusRes && statusRes.delivery_status) {
            const rawStatus = String(statusRes.delivery_status).toLowerCase();
            let newWebsiteStatus = order.status;

            if (rawStatus === 'delivered' || rawStatus === 'partial_delivered') {
              newWebsiteStatus = 'delivered';
            } else if (rawStatus === 'cancelled') {
              newWebsiteStatus = 'cancelled';
            } else if (rawStatus === 'in_review' || rawStatus === 'pending' || rawStatus === 'hold') {
              newWebsiteStatus = 'processing';
            }

            if (rawStatus !== order.courier_status || newWebsiteStatus !== order.status) {
              await supabase
                .from('orders')
                .update({
                  courier_status: rawStatus,
                  status: newWebsiteStatus,
                })
                .eq('id', order.id);

              updatedCount++;
            }
          }
        } catch (err) {
          console.warn(`Steadfast status sync error for order ${order.id}:`, err);
        }
      } else if (order.courier_name === 'pathao' && order.courier_consignment_id && pathaoToken) {
        try {
          const info = await getPathaoOrderInfo(order.courier_consignment_id, pathaoConfig, pathaoToken);
          if (info && (info.order_status || info.status)) {
            const rawStatus = String(info.order_status || info.status).toLowerCase();
            let newWebsiteStatus = order.status;

            if (rawStatus.includes('delivered')) {
              newWebsiteStatus = 'delivered';
            } else if (rawStatus.includes('cancel') || rawStatus.includes('return')) {
              newWebsiteStatus = 'cancelled';
            } else if (rawStatus.includes('in_transit') || rawStatus.includes('picked') || rawStatus.includes('dispatch')) {
              newWebsiteStatus = 'shipped';
            }

            if (rawStatus !== order.courier_status || newWebsiteStatus !== order.status) {
              await supabase
                .from('orders')
                .update({
                  courier_status: info.order_status || info.status,
                  status: newWebsiteStatus,
                })
                .eq('id', order.id);

              updatedCount++;
            }
          }
        } catch (err) {
          console.warn(`Pathao status sync error for order ${order.id}:`, err);
        }
      }
    }

    return { updated: updatedCount, checked: activeOrders.length };
  } catch (err) {
    console.error('syncAllDispatchedOrders failed:', err);
    return { updated: 0, checked: 0 };
  }
}
