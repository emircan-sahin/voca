import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { ITranscript } from '@voca/shared';
import { Badge } from 'poyraz-ui/atoms';
import { TranscriptCard } from '~/components/TranscriptCard';

interface HistoryViewProps {
  transcripts: ITranscript[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onDelete: (id: string) => void;
}

export const HistoryView = ({ transcripts, hasMore, isLoadingMore, onLoadMore, onDelete }: HistoryViewProps) => {
  const { t } = useTranslation();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  // Re-observed after each page: an observer only fires on changes, so a sentinel that is
  // still visible after a short page would otherwise never ask for the next one.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onLoadMoreRef.current();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, transcripts.length]);

  return (
    <div className="p-6 pb-20">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-medium text-[#171717]">{t('history.allTranscripts')}</h3>
        <Badge variant="secondary">
          {transcripts.length}
          {hasMore && '+'}
        </Badge>
      </div>

      {transcripts.length === 0 ? (
        <p className="text-[#737373] text-sm text-center py-12">
          {t('history.empty')}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {transcripts.map((tr) => (
            <TranscriptCard key={tr.id} transcript={tr} onDelete={onDelete} />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin text-[#737373]" />}
        </div>
      )}
    </div>
  );
};
