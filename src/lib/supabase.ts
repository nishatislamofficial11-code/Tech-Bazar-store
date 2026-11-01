import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isDemoModeActive, createMockMutationBuilder } from './demoMode';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tvfhsgokbwekpfyrmhbl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_F2Vql83Ewz488LnbxNFkQQ_61zuR9PS';

export const rawSupabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Proxied Supabase client that seamlessly intercepts mutation calls (insert/update/upsert/delete)
 * when the active authenticated session has role="demo".
 * Read operations (select) execute normally.
 */
export const supabase: SupabaseClient = new Proxy(rawSupabase, {
  get(target: any, prop: string | symbol, receiver: any) {
    if (prop === 'from') {
      return function (table: string) {
        const queryBuilder = target.from(table);
        if (!isDemoModeActive()) {
          return queryBuilder;
        }

        // When Demo Mode is active, intercept mutation operations
        return new Proxy(queryBuilder, {
          get(tableTarget: any, tableProp: string | symbol, tableReceiver: any) {
            if (
              tableProp === 'insert' ||
              tableProp === 'update' ||
              tableProp === 'upsert' ||
              tableProp === 'delete'
            ) {
              return function (...args: any[]) {
                return createMockMutationBuilder(table, String(tableProp), args[0]);
              };
            }

            const orig = Reflect.get(tableTarget, tableProp, tableReceiver);
            if (typeof orig === 'function') {
              return orig.bind(tableTarget);
            }
            return orig;
          }
        });
      };
    }

    if (prop === 'storage') {
      const storage = target.storage;
      if (!isDemoModeActive()) return storage;

      return new Proxy(storage, {
        get(storageTarget: any, storageProp: string | symbol, storageReceiver: any) {
          if (storageProp === 'from') {
            return function (bucket: string) {
              const bucketClient = storageTarget.from(bucket);
              return new Proxy(bucketClient, {
                get(bucketTarget: any, bucketProp: string | symbol, bucketReceiver: any) {
                  if (bucketProp === 'upload' || bucketProp === 'update') {
                    return async function (..._args: any[]) {
                      console.info(`[Demo Mode] Simulated file upload to bucket "${bucket}".`);
                      return { data: { path: `demo_placeholder_${Date.now()}.png`, id: 'demo' }, error: null };
                    };
                  }
                  if (bucketProp === 'remove') {
                    return async function (..._args: any[]) {
                      console.info(`[Demo Mode] Simulated file removal from bucket "${bucket}".`);
                      return { data: [], error: null };
                    };
                  }
                  const orig = Reflect.get(bucketTarget, bucketProp, bucketReceiver);
                  return typeof orig === 'function' ? orig.bind(bucketTarget) : orig;
                }
              });
            };
          }
          const orig = Reflect.get(storageTarget, storageProp, storageReceiver);
          return typeof orig === 'function' ? orig.bind(storageTarget) : orig;
        }
      });
    }

    const orig = Reflect.get(target, prop, receiver);
    if (typeof orig === 'function') {
      return orig.bind(target);
    }
    return orig;
  }
}) as SupabaseClient;
