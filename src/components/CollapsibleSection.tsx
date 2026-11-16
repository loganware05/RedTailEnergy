import { ReactNode, useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  summary: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  highlightSummary?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  summary,
  icon: Icon,
  defaultOpen = false,
  highlightSummary = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl bg-surface border border-edge overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full min-h-[60px] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gold-band text-gold-band-ink flex items-center justify-center shrink-0 border border-black/10">
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-charcoal truncate">{title}</h2>
            <p
              className={`text-xs sm:text-sm truncate ${
                highlightSummary ? 'font-bold text-crimson-ink' : 'text-charcoal-muted'
              }`}
            >
              {summary}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-charcoal-muted shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && <div className="px-4 sm:px-6 pb-5 pt-2 border-t border-edge">{children}</div>}
    </section>
  );
}
