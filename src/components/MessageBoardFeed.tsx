import { useState } from 'react';
import { ChevronUp, MessageSquarePlus } from 'lucide-react';
import { Announcement } from '../types/hub';

interface MessageBoardFeedProps {
  announcements: Announcement[];
  onUpvote: (id: string) => void;
  canPost?: boolean;
  onPost?: (category: Announcement['category'], title: string, body: string) => void;
}

export function MessageBoardFeed({
  announcements,
  onUpvote,
  canPost = false,
  onPost,
}: MessageBoardFeedProps) {
  const [filter, setFilter] = useState<'All' | Announcement['category']>('All');
  const [composerOpen, setComposerOpen] = useState(false);
  const [cat, setCat] = useState<Announcement['category']>('Update');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const filtered =
    filter === 'All' ? announcements : announcements.filter((a) => a.category === filter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onPost || !title.trim()) return;
    onPost(cat, title.trim(), body.trim());
    setTitle('');
    setBody('');
    setComposerOpen(false);
  };

  return (
    <section className="rounded-2xl bg-surface border border-edge overflow-hidden">
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-edge bg-surface-alt space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-bold text-charcoal">Community Message Board</h2>
          {canPost && onPost && (
            <button
              type="button"
              onClick={() => setComposerOpen((v) => !v)}
              className="min-h-[36px] px-3 rounded-lg bg-crimson text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-crimson-dark cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{composerOpen ? 'Close' : 'Post'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {(['All', 'Power', 'Shuttle', 'Training', 'Update'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                filter === item
                  ? 'bg-crimson text-white'
                  : 'bg-surface border border-edge text-charcoal hover:bg-surface-hover'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {composerOpen && canPost && onPost && (
          <form onSubmit={handleSubmit} className="pt-2 space-y-2 border-t border-edge">
            <div className="flex gap-2">
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value as Announcement['category'])}
                className="min-h-[40px] px-2.5 rounded-lg border border-edge bg-input-bg text-xs font-semibold text-charcoal"
              >
                <option value="Power">Power</option>
                <option value="Shuttle">Shuttle</option>
                <option value="Training">Training</option>
                <option value="Update">Update</option>
              </select>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short headline..."
                required
                className="flex-1 min-h-[40px] px-3 rounded-lg border border-edge bg-input-bg text-sm text-charcoal"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Optional 1-line detail..."
                className="flex-1 min-h-[40px] px-3 rounded-lg border border-edge bg-input-bg text-sm text-charcoal"
              />
              <button
                type="submit"
                className="min-h-[40px] px-4 rounded-lg bg-crimson text-white text-xs font-bold cursor-pointer"
              >
                Send
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="divide-y divide-edge">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-charcoal-muted">No posts in this category yet.</p>
        ) : (
          filtered.map((item) => (
            <article key={item.id} className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-charcoal-muted">
                  <span className="font-bold text-crimson-ink">{item.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.author}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{item.postedTimeLabel}</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-charcoal leading-snug">{item.title}</h3>
                {item.body && <p className="text-xs sm:text-sm text-charcoal-muted leading-snug">{item.body}</p>}
              </div>

              <button
                type="button"
                onClick={() => onUpvote(item.id)}
                aria-label={`Mark helpful (${item.upvotes})`}
                className={`min-w-[44px] min-h-[44px] px-2 py-1 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  item.upvoted
                    ? 'bg-gold-band border-edge-strong text-gold-band-ink'
                    : 'bg-surface-alt border-edge text-charcoal hover:bg-surface-hover'
                }`}
              >
                <ChevronUp className="w-4 h-4 -mb-0.5" aria-hidden="true" />
                <span className="text-xs font-mono tabular-nums font-bold">{item.upvotes}</span>
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
