import { useEffect, useState } from 'react';
import { Delete, Lock, X } from 'lucide-react';
import { DEMO_PIN } from '../data/initialState';
import { RoleId } from '../types/hub';

interface PinModalProps {
  targetRole: RoleId | null;
  onCancel: () => void;
  onSuccess: (role: RoleId) => void;
}

const ROLE_TITLES: Record<RoleId, string> = {
  home: 'Home',
  resident: 'Resident',
  staff: 'Hub Staff',
  lead: 'Hub Lead',
  engineer: 'Student / Engineer',
};

export function PinModal({ targetRole, onCancel, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPin('');
    setError('');
  }, [targetRole]);

  useEffect(() => {
    if (!targetRole) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (/^\d$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        setError('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!targetRole) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError('');

    if (next.length === 4) {
      if (next === DEMO_PIN) {
        onSuccess(targetRole);
      } else {
        setError('Incorrect PIN. Please try again.');
        setTimeout(() => setPin(''), 300);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
    >
      <div className="w-full max-w-sm bg-surface text-charcoal rounded-2xl border border-edge shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-crimson text-white flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="pin-modal-title" className="text-lg font-bold text-charcoal">
                Enter {ROLE_TITLES[targetRole]} PIN
              </h2>
              <p className="text-xs text-charcoal-muted">Prototype - simulated data · Staff PIN required</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel PIN entry"
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-charcoal-muted hover:bg-surface-hover cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 py-2" aria-live="polite">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-mono font-bold transition-colors ${
                pin.length > idx
                  ? 'border-crimson bg-crimson-soft text-crimson-ink'
                  : 'border-edge bg-surface-alt text-charcoal-muted'
              }`}
            >
              {pin.length > idx ? '•' : ''}
            </div>
          ))}
        </div>

        {error ? (
          <p className="text-center text-sm font-medium text-crimson-ink" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-center text-xs text-charcoal-muted">
            Residents never need a PIN. Enter your staff PIN to continue.
          </p>
        )}

        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="min-h-[52px] rounded-xl bg-surface-alt hover:bg-surface-hover border border-edge active:scale-[0.98] text-lg font-bold tabular-nums text-charcoal transition-all cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setPin('');
              setError('');
            }}
            className="min-h-[52px] rounded-xl border border-edge text-xs font-semibold text-charcoal-muted hover:bg-surface-hover cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="min-h-[52px] rounded-xl bg-surface-alt hover:bg-surface-hover border border-edge active:scale-[0.98] text-lg font-bold tabular-nums text-charcoal transition-all cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => {
              setPin((prev) => prev.slice(0, -1));
              setError('');
            }}
            aria-label="Backspace"
            className="min-h-[52px] rounded-xl border border-edge flex items-center justify-center text-charcoal hover:bg-surface-hover cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
