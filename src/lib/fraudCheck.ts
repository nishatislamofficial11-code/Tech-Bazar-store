
export function getCleanCourierName(key: string, originalName?: string) {
  const knownCouriers: Record<string, { name: string; aliases: string[] }> = {
    steadfast: { name: 'Steadfast Courier', aliases: ['steadfast', 'stead_fast', 'sf'] },
    pathao: { name: 'Pathao Courier', aliases: ['pathao', 'pathao_courier'] },
    redx: { name: 'RedX Delivery', aliases: ['redx', 'red_x'] },
    paperfly: { name: 'Paperfly', aliases: ['paperfly', 'paper_fly'] },
    ecourier: { name: 'eCourier', aliases: ['ecourier', 'e_courier'] },
    parceldex: { name: 'ParcelDex', aliases: ['parceldex', 'parcel_dex'] },
    carrybee: { name: 'CarryBee', aliases: ['carrybee', 'carry_bee'] },
    sundarban: { name: 'Sundarban Courier', aliases: ['sundarban', 'sundorbon'] },
    sa_paribahan: { name: 'SA Paribahan', aliases: ['sa_paribahan', 'saparibahan'] },
    korotoya: { name: 'Korotoya Courier', aliases: ['korotoya'] }
  };

  if (originalName && originalName.trim()) return originalName.trim();
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(knownCouriers)) {
    if (v.aliases.some(a => lower.includes(a))) {
      return v.name;
    }
  }
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function extractFraudReports(resultData: any): FraudReport[] {
  if (!resultData || typeof resultData !== 'object') return [];

  const rawData = resultData.data || resultData;
  const reports: FraudReport[] = [];

  const reportSources = [
    rawData.reports,
    rawData.complaints,
    rawData.fraud_reports,
    rawData.fraud_records,
    rawData.fraud_data,
    rawData.customer_reports
  ];

  if (Array.isArray(resultData.reports)) {
    reports.push(...resultData.reports);
  }

  const parseReportArray = (arr: any[], defaultCourier = 'Unknown Courier') => {
    if (!Array.isArray(arr)) return;
    arr.forEach(item => {
      if (typeof item === 'string') {
        reports.push({ courierName: defaultCourier, created_at: new Date().toISOString(), details: item });
      } else if (item && typeof item === 'object') {
        let courier = item.courier_name || item.courierName || item.courier || defaultCourier;
        courier = getCleanCourierName(courier);
        
        reports.push({
          courierName: courier,
          created_at: item.created_at || item.date || item.time || new Date().toISOString(),
          details: item.details || item.complaint || item.message || item.reason || item.remark || JSON.stringify(item)
        });
      }
    });
  };

  reportSources.forEach(source => {
    if (Array.isArray(source)) {
      parseReportArray(source);
    } else if (source && typeof source === 'object') {
      Object.entries(source).forEach(([key, val]: [string, any]) => {
         if (Array.isArray(val)) {
           parseReportArray(val, key);
         }
      });
    }
  });

  const nestedSources = [
    rawData.courier_details,
    rawData.couriers,
    rawData.details,
    rawData.breakdown,
  ];

  nestedSources.forEach(source => {
     if (source && typeof source === 'object') {
       if (Array.isArray(source)) {
         source.forEach((item: any) => {
            const courier = item.courier || item.name || 'Courier';
            if (item.reports) parseReportArray(item.reports, courier);
            if (item.complaints) parseReportArray(item.complaints, courier);
            if (item.fraud_reports) parseReportArray(item.fraud_reports, courier);
         });
       } else {
         Object.entries(source).forEach(([k, val]: [string, any]) => {
            if (val && typeof val === 'object') {
              if (val.reports) parseReportArray(val.reports, k);
              if (val.complaints) parseReportArray(val.complaints, k);
              if (val.fraud_reports) parseReportArray(val.fraud_reports, k);
            }
         });
       }
     }
  });

  const uniqueReports = reports.filter((r, index, self) => 
    index === self.findIndex((t) => (
      t.details === r.details && t.courierName === r.courierName
    ))
  );

  return uniqueReports;
}
import { supabase } from './supabase';

export interface FraudCheckSummary {
  total_parcel: number;
  success_parcel: number;
  cancelled_parcel: number;
  success_ratio: number;
}

export interface CourierBreakdownItem {
  courier_key: string;
  name: string;
  total_parcel: number;
  success_parcel: number;
  cancelled_parcel: number;
  success_ratio: number;
}

export interface FraudReport {
  courierName?: string;
  created_at: string;
  details: string;
}

export interface FraudCheckResultData {
  status?: string;
  message?: string;
  error?: string;
  checkedAt?: string;
  data?: {
    summary?: FraudCheckSummary;
    couriers?: Record<string, any> | any[];
    courier_details?: Record<string, any> | any[];
    [key: string]: any;
  };
  reports?: FraudReport[];
  [key: string]: any;
}

/**
 * Extracts clean 11-digit phone number for Bangladesh numbers
 */
export function getCleanPhoneNumber(phoneStr: string): string {
  if (!phoneStr) return '';
  const digits = phoneStr.replace(/\D/g, '');
  if (digits.length >= 11) {
    return digits.slice(-11);
  }
  return digits;
}

/**
 * Extracts individual courier breakdowns from BDCourier or custom courier responses
 */
export function extractCourierBreakdowns(resultData: any): CourierBreakdownItem[] {
  if (!resultData || typeof resultData !== 'object') return [];

  const rawData = resultData.data || resultData;
  const list: CourierBreakdownItem[] = [];
  const addedKeys = new Set<string>();

  const knownCouriers: Record<string, { name: string; aliases: string[] }> = {
    steadfast: { name: 'Steadfast Courier', aliases: ['steadfast', 'stead_fast', 'sf'] },
    pathao: { name: 'Pathao Courier', aliases: ['pathao', 'pathao_courier'] },
    redx: { name: 'RedX Delivery', aliases: ['redx', 'red_x'] },
    paperfly: { name: 'Paperfly', aliases: ['paperfly', 'paper_fly'] },
    ecourier: { name: 'eCourier', aliases: ['ecourier', 'e_courier'] },
    parceldex: { name: 'ParcelDex', aliases: ['parceldex', 'parcel_dex'] },
    carrybee: { name: 'CarryBee', aliases: ['carrybee', 'carry_bee'] },
    sundarban: { name: 'Sundarban Courier', aliases: ['sundarban', 'sundorbon'] },
    sa_paribahan: { name: 'SA Paribahan', aliases: ['sa_paribahan', 'saparibahan'] },
    korotoya: { name: 'Korotoya Courier', aliases: ['korotoya'] }
  };

  const getCleanName = (key: string, originalName?: string) => {
    if (originalName && originalName.trim()) return originalName.trim();
    const lower = key.toLowerCase();
    for (const [k, v] of Object.entries(knownCouriers)) {
      if (v.aliases.some(a => lower.includes(a))) {
        return v.name;
      }
    }
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const processItem = (key: string, item: any) => {
    if (!item || typeof item !== 'object') return;
    if (key === 'summary') return; // skip global summary

    const total = Number(item.total_parcel ?? item.total ?? item.parcels ?? item.total_parcels ?? 0);
    const success = Number(item.success_parcel ?? item.success ?? item.delivered ?? item.success_parcels ?? 0);
    const cancelled = Number(item.cancelled_parcel ?? item.cancelled ?? item.returned ?? item.cancelled_parcels ?? 0);
    let ratio = Number(item.success_ratio ?? item.ratio ?? item.success_rate ?? 0);

    if (!ratio && total > 0) {
      ratio = Math.round((success / total) * 100);
    }

    const cleanKey = key.toLowerCase().trim();
    if (addedKeys.has(cleanKey)) return;
    addedKeys.add(cleanKey);

    const displayName = getCleanName(cleanKey, item.name || item.courier_name || item.courier);

    list.push({
      courier_key: cleanKey,
      name: displayName,
      total_parcel: total,
      success_parcel: success,
      cancelled_parcel: cancelled,
      success_ratio: ratio
    });
  };

  // 1. Check nested courier maps (e.g. data.couriers, data.courier_details, data.details, data.breakdown)
  const nestedSources = [
    rawData.courier_details,
    rawData.couriers,
    rawData.details,
    rawData.breakdown,
    rawData.courier_breakdown,
    rawData.courier_data
  ];

  for (const source of nestedSources) {
    if (source && typeof source === 'object') {
      if (Array.isArray(source)) {
        source.forEach((item: any, idx: number) => {
          const key = item.courier || item.name || item.code || `courier_${idx}`;
          processItem(key, item);
        });
      } else {
        Object.entries(source).forEach(([k, v]) => {
          processItem(k, v);
        });
      }
    }
  }

  // 2. Check direct known courier keys on rawData (e.g. rawData.steadfast, rawData.pathao, etc.)
  for (const [courierKey, info] of Object.entries(knownCouriers)) {
    for (const alias of info.aliases) {
      if (rawData[alias] && typeof rawData[alias] === 'object') {
        processItem(courierKey, rawData[alias]);
        break;
      }
    }
  }

  // Sort list with couriers having orders first, and highest parcels on top
  return list.sort((a, b) => b.total_parcel - a.total_parcel);
}

/**
 * Retrieves cached fraud check result from localStorage for a phone number
 */
export function getLocalFraudCache(phone: string): FraudCheckResultData | null {
  const cleanPhone = getCleanPhoneNumber(phone);
  if (!cleanPhone) return null;

  try {
    const raw = localStorage.getItem(`bd_fraud_cache_${cleanPhone}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error reading fraud cache from localStorage:', err);
  }
  return null;
}

/**
 * Saves fraud check result into localStorage for a phone number
 */
export function saveLocalFraudCache(phone: string, resultData: FraudCheckResultData): void {
  const cleanPhone = getCleanPhoneNumber(phone);
  if (!cleanPhone) return;

  try {
    const payload = {
      ...resultData,
      checkedAt: resultData.checkedAt || new Date().toISOString()
    };
    localStorage.setItem(`bd_fraud_cache_${cleanPhone}`, JSON.stringify(payload));
  } catch (err) {
    console.warn('Error saving fraud cache to localStorage:', err);
  }
}

/**
 * Calls BD Courier Fraud Check API
 */
export async function checkFraudFromApi(phone: string, apiKey: string): Promise<FraudCheckResultData> {
  const cleanPhone = getCleanPhoneNumber(phone);
  if (!cleanPhone) {
    throw new Error('Valid phone number is required');
  }
  if (!apiKey || !apiKey.trim()) {
    throw new Error('BD Courier API Key is missing');
  }

  const response = await fetch('https://api.bdcourier.com/courier-check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify({ phone: cleanPhone })
  });

  const data = await response.json();
  const checkedAt = new Date().toISOString();

  if (data.status === 'success' || data.success === true || data.data) {
    const result: FraudCheckResultData = {
      ...data,
      checkedAt
    };
    saveLocalFraudCache(cleanPhone, result);
    return result;
  } else {
    const errResult: FraudCheckResultData = {
      error: data.message || 'Failed to check number',
      checkedAt
    };
    return errResult;
  }
}

/**
 * Saves fraud check result directly into an order in Supabase
 */
export async function saveOrderFraudResult(orderId: string, resultData: FraudCheckResultData, phone?: string): Promise<void> {
  if (phone) {
    saveLocalFraudCache(phone, resultData);
  }

  try {
    const payload = {
      ...resultData,
      checkedAt: resultData.checkedAt || new Date().toISOString()
    };
    await supabase.from('orders').update({ fraud_result: payload }).eq('id', orderId);
  } catch (err) {
    console.warn('Failed to update order fraud_result in Supabase:', err);
  }
}
