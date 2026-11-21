import React from 'react';
import { Palette } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { STORE_THEMES, themeIdOf, StoreThemeId } from '../../lib/storeTheme';

/** Small note in admin pages saying how the shop's current theme uses this setting. */
export function ThemeHint({ text, className = '' }: { text: Partial<Record<StoreThemeId, React.ReactNode>>; className?: string }) {
  const { settings } = useSettings();
  const id = themeIdOf(settings?.active_theme);
  const body = text[id];
  if (!body) return null;
  const name = STORE_THEMES.find((t) => t.id === id)?.name;
  return (
    <div className={`flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-slate-700 leading-relaxed ${className}`}>
      <Palette size={15} className="mt-0.5 shrink-0 text-primary" />
      <div><b className="text-primary">{name} থিম:</b> {body}</div>
    </div>
  );
}
