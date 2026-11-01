/**
 * Demo Role & Safe Mutation Interceptor Engine
 * Allows users with role="demo" full administrative browsing access while 
 * strictly simulating mutation success (notifications appear normally)
 * without making any permanent modifications to the database.
 */

const DEMO_STORAGE_KEY = 'store_demo_role_active';

/**
 * Check if the active session is currently running in Demo Mode
 */
export function isDemoModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Set or clear Demo Mode active flag
 */
export function setDemoModeActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (active) {
      localStorage.setItem(DEMO_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or disabled localStorage
  }
}

/**
 * Creates a chainable mock thenable for Supabase mutations in Demo Mode
 * Simulates standard PostgREST response { data, error: null, count: 1, status: 200 }
 */
export function createMockMutationBuilder(table: string, operation: string, payload: any) {
  let isSingle = false;
  let isMaybeSingle = false;

  const builder: any = {
    // Chainable filter & modifier methods
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    is: () => builder,
    in: () => builder,
    contains: () => builder,
    containedBy: () => builder,
    rangeGt: () => builder,
    rangeGte: () => builder,
    rangeLt: () => builder,
    rangeLte: () => builder,
    rangeAdjacent: () => builder,
    overlaps: () => builder,
    textSearch: () => builder,
    match: () => builder,
    not: () => builder,
    or: () => builder,
    filter: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    abortSignal: () => builder,
    select: () => builder,
    csv: () => builder,
    returns: () => builder,
    throwOnError: () => builder,

    single: () => {
      isSingle = true;
      return builder;
    },

    maybeSingle: () => {
      isMaybeSingle = true;
      return builder;
    },

    // Promise implementation
    then: (onResolve?: (res: any) => any, onReject?: (err: any) => any) => {
      console.info(
        `%c[Demo Mode] Simulated "${operation}" on table "${table}" (Database is protected, no change was saved).`,
        'color: #f59e0b; font-weight: bold;',
        { table, operation, payload }
      );

      let mockData: any = null;
      if (operation === 'delete') {
        mockData = null;
      } else if (isSingle) {
        mockData = Array.isArray(payload) ? (payload[0] || {}) : (payload || {});
      } else if (isMaybeSingle) {
        mockData = Array.isArray(payload) ? (payload[0] || null) : (payload || null);
      } else {
        mockData = Array.isArray(payload) ? payload : (payload ? [payload] : []);
      }

      const response = {
        data: mockData,
        error: null,
        count: 1,
        status: 200,
        statusText: 'OK (Demo Mode Simulated)'
      };

      if (onResolve) {
        try {
          return Promise.resolve(onResolve(response));
        } catch (e) {
          if (onReject) return Promise.resolve(onReject(e));
          return Promise.reject(e);
        }
      }
      return Promise.resolve(response);
    },

    catch: (onReject: (err: any) => any) => {
      return builder.then(undefined, onReject);
    },

    finally: (onFinally?: () => void) => {
      return builder.then().finally(onFinally);
    }
  };

  return builder;
}
