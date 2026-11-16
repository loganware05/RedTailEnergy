import { useEffect } from 'react';
import { Palette, X } from 'lucide-react';
import { ThemeId } from '../types/hub';
import { THEME_OPTIONS } from './ThemeSwitcher';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  theme: ThemeId;
  onChangeTheme: (theme: ThemeId) => void;
}

export function SettingsModal({ open, onClose, theme, onChangeTheme }: SettingsModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-surface text-charcoal rounded-t-3xl sm:rounded-2xl border border-edge shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1.5 bg-edge-strong rounded-full mx-auto mt-3" />

        <div className="px-5 py-4 bg-hero-bg text-hero-ink border-b-2 border-hero-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-gold shrink-0" aria-hidden="true" />
            <div>
              <h2 id="settings-modal-title" className="text-lg font-bold leading-tight">
                Settings
              </h2>
              <p className="text-xs text-hero-sub">Appearance &amp; Red Tail Hub theme palette</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-w-[44px] min-h-[44px] rounded-xl border border-white/25 bg-black/20 flex items-center justify-center text-white hover:bg-black/35 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-charcoal">Red &amp; Gold Theme Options</h3>
            <p className="text-xs text-charcoal-muted">
              Choose a crimson and gold palette. Changes apply immediately across all views.
            </p>
          </div>

          <div className="space-y-2.5">
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeTheme(opt.id)}
                  aria-pressed={active}
                  className={`w-full min-h-[64px] text-left rounded-xl border p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    active
                      ? 'bg-gold-band text-gold-band-ink border-edge-strong shadow-xs'
                      : 'bg-surface-alt hover:bg-surface-hover text-charcoal border-edge'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center -space-x-1.5 shrink-0" aria-hidden="true">
                      {opt.swatches.map((hex) => (
                        <span
                          key={hex}
                          className="w-6 h-6 rounded-full border border-black/25 shadow-xs"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{opt.name}</div>
                      <div
                        className={`text-xs truncate ${
                          active ? 'text-gold-band-ink/85 font-medium' : 'text-charcoal-muted'
                        }`}
                      >
                        {opt.tagline}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold shrink-0 ${
                      active ? 'text-crimson-ink' : 'text-charcoal-muted'
                    }`}
                  >
                    {active ? 'Active' : 'Select'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-edge flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-white text-sm font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
