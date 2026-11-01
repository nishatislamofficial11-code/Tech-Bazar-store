import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchClientIp, checkIsBlocked } from '../lib/blacklist';
import { BlockedVisitor } from './BlockedVisitor';

export function GlobalIpGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [clientIp, setClientIp] = useState<string>('');
  const [reason, setReason] = useState<string | undefined>();

  // 1. Listen for real-time auto-trap event for instantaneous screen lockout
  useEffect(() => {
    const handleClientBlocked = (e: any) => {
      if (pathname.startsWith('/admin') || pathname === '/signin') return;
      setIsBlocked(true);
      if (e?.detail?.ip) setClientIp(e.detail.ip);
      if (e?.detail?.reason) setReason(e.detail.reason);
    };

    window.addEventListener('client_blocked', handleClientBlocked);
    return () => window.removeEventListener('client_blocked', handleClientBlocked);
  }, [pathname]);

  // 2. Continuous IP & blacklist verification
  useEffect(() => {
    let isMounted = true;

    // Check localStorage cache first for zero-latency instant lockout
    try {
      const local = localStorage.getItem('sys_client_blocked');
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed?.isBlocked) {
          setIsBlocked(true);
          if (parsed.ip) setClientIp(parsed.ip);
          if (parsed.reason) setReason(parsed.reason);
        }
      }
    } catch (e) {}

    const checkIp = async () => {
      try {
        const ip = await fetchClientIp();
        if (!isMounted) return;

        if (ip && ip !== 'Unknown') {
          setClientIp(ip);
          // Check if IP is in blacklist (don't auto-trap inside GlobalIpGuard check)
          const res = await checkIsBlocked(ip, '', false);
          if (res.isBlocked && (res.blockedType === 'ip' || res.blockedType === 'both')) {
            setIsBlocked(true);
            setReason(res.reason);
          } else {
            // If the IP is clean and not blocked in DB, remove any stale local lockout
            try { localStorage.removeItem('sys_client_blocked'); } catch (e) {}
            setIsBlocked(false);
          }
        }
      } catch (err) {
        console.error('Error running GlobalIpGuard:', err);
      }
    };

    checkIp();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  // NEVER block admin panel or signin pages so store owners/admins can always access and manage
  const isAdminRoute = pathname.startsWith('/admin') || pathname === '/signin';

  if (isBlocked && !isAdminRoute) {
    return <BlockedVisitor clientIp={clientIp} reason={reason} />;
  }

  return <>{children}</>;
}
