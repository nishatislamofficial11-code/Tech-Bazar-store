import React from 'react';

// Shared frame for the Cloud Commerce merchant pages (sign-up, login, reset)
export function CCLogo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#3a3fd4" />
      <g transform="translate(32 32) scale(1.15) translate(-32 -32)">
        <path d="M32.1 24.9A10 10 0 1 0 32.1 39.1" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M47.1 24.9A10 10 0 1 0 47.1 39.1" fill="none" stroke="#ff8a3d" strokeWidth="5.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function MerchantShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f7ff] text-[#121628]" style={{ fontFamily: "'Hind Siliguri', 'Sora', system-ui, sans-serif" }}>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <a href="/platform/" className="flex items-center gap-2.5" aria-label="Cloud Commerce হোম">
          <CCLogo />
          <span className="text-xl tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
            <b className="font-bold">cloud</b><span className="font-light">commerce</span>
          </span>
        </a>
      </header>
      <main className="mx-auto w-full max-w-md px-4 pb-16 pt-4">
        <div className="rounded-3xl border border-[#e1e4f3] bg-white p-6 shadow-[0_18px_50px_-24px_rgba(40,44,140,.35)] sm:p-8">
          <h1 className="text-2xl font-bold leading-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[15px] text-[#59607a]">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

export const inputCls = 'w-full rounded-xl border border-[#e1e4f3] bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#3a3fd4] focus:ring-4 focus:ring-[#3a3fd4]/15';
export const labelCls = 'mb-1.5 block text-sm font-semibold';
export const primaryBtn = 'flex w-full items-center justify-center gap-2 rounded-full bg-[#3a3fd4] px-6 py-3.5 font-bold text-white transition hover:bg-[#2f33b8] disabled:cursor-not-allowed disabled:opacity-60';
