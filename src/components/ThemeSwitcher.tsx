import { Palette } from 'lucide-react';
import { ThemeId } from '../types/hub';

interface ThemeOption {
  id: ThemeId;
  name: string;
  tagline: string;
  swatches: [string, string, string];
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'heritage',
    name: 'Heritage Crimson & Gold',
    tagline: 'Warm parchment, deep crimson & burnished gold',
    swatches: ['#8B1E24', '#C99A2E', '#F3E8D2'],
  },
  {
    id: 'command',
    name: 'Crimson Command',
    tagline: 'Oxblood red field, garnet cards & champagne gold',
    swatches: ['#32090C', '#6D141A', '#F4C95D'],
  },
  {
    id: 'goldfield',
    name: 'Sunlit Gold & Crimson',
    tagline: 'Harvest gold canvas with bold crimson headers',
    swatches: ['#D4A02E', '#E6CA82', '#8B1E24'],
  },
];

interface ThemeSwitcherProps {
  theme: ThemeId;
  onChangeTheme: (theme: ThemeId) => void;
  compact?: boolean;
}

export function ThemeSwitcher({ theme, onChangeTheme, compact = false }: ThemeSwitcherProps) {
  return (
    <section
      aria-label="Red and Gold Design Palette"
      className={`rounded-2xl bg-surface border border-edge ${compact ? 'p-3.5 space-y-2.5' : 'p-4 sm:p-5 space-y-3'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-crimson-ink shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-bold text-charcoal">Red &amp; Gold Theme Options</h2>
        </div>
        <span className="text-xs text-charcoal-muted">Instant live preview</span>
      </div>

      <div className={`grid gap-2.5 ${compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {THEME_OPTIONS.map((opt) => {
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChangeTheme(opt.id)}
              aria-pressed={active}
              className={`min-h-[52px] text-left rounded-xl border p-3 transition-all cursor-pointer flex items-center gap-3 ${
                active
                  ? 'bg-gold-band text-gold-band-ink border-edge-strong shadow-xs'
                  : 'bg-surface-alt hover:bg-surface-hover text-charcoal border-edge'
              }`}
            >
              <div className="flex items-center -space-x-1.5 shrink-0" aria-hidden="true">
                {opt.swatches.map((hex) => (
                  <span
                    key={hex}
                    className="w-5 h-5 rounded-full border border-black/25 shadow-xs"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate">{opt.name}</div>
                {!compact && (
                  <div
                    className={`text-[11px] truncate ${
                      active ? 'text-gold-band-ink/85 font-medium' : 'text-charcoal-muted'
                    }`}
                  >
                    {opt.tagline}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
