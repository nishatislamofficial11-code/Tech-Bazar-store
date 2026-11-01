import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Link } from 'react-router-dom';
import { Megaphone, X, ArrowRight } from 'lucide-react';
import { isBot } from '../../lib/isBot';

export const AnnouncementBar: React.FC = () => {
  const { settings } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  const isEnabled = settings?.theme_announcement_enabled === 'true';
  const text = settings?.theme_announcement_text || '';
  const isMarquee = settings?.theme_announcement_marquee === 'true';
  const bg = settings?.theme_announcement_bg || 'var(--color-primary, #0066ff)';
  const color = settings?.theme_announcement_color || '#ffffff';
  const link = settings?.theme_announcement_link || '';
  
  const isLighthouse = isBot();

  if (!isEnabled || !text.trim() || dismissed) {
    return null;
  }

  const content = (
    <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold tracking-wide py-2 px-4">
      <Megaphone size={15} className="shrink-0" />
      <span>{text}</span>
      {link && (
        <span className="inline-flex items-center gap-1 underline underline-offset-2 ml-1 text-xs opacity-90 hover:opacity-100 font-bold">
          বিস্তারিত <ArrowRight size={12} />
        </span>
      )}
    </div>
  );

  return (
    <div
      className="relative z-50 overflow-hidden text-center transition-all duration-300 shadow-sm"
      style={{ backgroundColor: bg, color: color }}
    >
      {isMarquee ? (
        <div className="relative w-full overflow-hidden py-2 whitespace-nowrap select-none">
          <div className={`${isLighthouse ? '' : 'animate-marquee'} flex items-center will-change-transform`}>
            {/* Sequence 1 */}
            <div className="flex items-center gap-8 shrink-0 px-4">
              {[...Array(6)].map((_, i) => (
                <div key={`m1-${i}`} className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
                  <Megaphone size={14} className={`shrink-0 ${isLighthouse ? '' : 'animate-pulse'}`} />
                  {link ? (
                    <Link to={link} className="hover:underline flex items-center gap-1">
                      {text}
                    </Link>
                  ) : (
                    <span>{text}</span>
                  )}
                  <span className="opacity-40 ml-4">•</span>
                </div>
              ))}
            </div>
            {/* Sequence 2 (identical duplicate for seamless infinite loop) */}
            <div className="flex items-center gap-8 shrink-0 px-4" aria-hidden="true">
              {[...Array(6)].map((_, i) => (
                <div key={`m2-${i}`} className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
                  <Megaphone size={14} className={`shrink-0 ${isLighthouse ? '' : 'animate-pulse'}`} />
                  {link ? (
                    <Link to={link} className="hover:underline flex items-center gap-1">
                      {text}
                    </Link>
                  ) : (
                    <span>{text}</span>
                  )}
                  <span className="opacity-40 ml-4">•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex-1 text-center">
            {link ? (
              <Link to={link} className="hover:underline inline-block">
                {content}
              </Link>
            ) : (
              content
            )}
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-full hover:bg-black/10 transition-colors opacity-70 hover:opacity-100 shrink-0"
            aria-label="Close announcement"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
