import { ArrowLeftRight, Settings, SlidersHorizontal } from 'lucide-react';
import { RoleId } from '../types/hub';

interface TopBarProps {
  activeRole: RoleId;
  onGoHome: () => void;
  onOpenSettings: () => void;
  onOpenDemoControls: () => void;
}

export function TopBar({ activeRole, onGoHome, onOpenSettings, onOpenDemoControls }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-header-bg border-b-2 border-header-border shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Single-line Brand Wordmark + Logo */}
        <button
          type="button"
          onClick={onGoHome}
          className="inline-flex items-center gap-2.5 text-left text-lg sm:text-xl font-bold tracking-tight text-header-ink hover:opacity-85 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
        >
          <img
            src="/assets/aistudio/Red_Tail_Energy_logo_828a9735.jpg"
            alt="Red Tail Energy logo"
            className="w-9 h-9 rounded-lg bg-white p-0.5 object-contain border border-gold/60 shrink-0 shadow-xs"
          />
          <span>Red Tail Energy</span>
        </button>

        {/* Compact Mobile-First Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {activeRole !== 'home' && (
            <button
              type="button"
              onClick={onGoHome}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-edge-strong bg-surface text-charcoal text-xs sm:text-sm font-semibold hover:bg-surface-hover active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-crimson-ink" aria-hidden="true" />
              <span>Roles</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-white/25 bg-black/20 text-white text-xs sm:text-sm font-semibold hover:bg-black/35 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            type="button"
            onClick={onOpenDemoControls}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 min-h-[40px] rounded-lg bg-gold text-gold-band-ink text-xs sm:text-sm font-bold hover:brightness-95 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer border border-black/15"
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            <span>Demo</span>
          </button>
        </div>
      </div>
    </header>
  );
}
