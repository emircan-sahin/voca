import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { ITranscript } from '@voca/shared';
import { Card, CardContent, Badge } from 'poyraz-ui/atoms';
import dayjs from '~/lib/dayjs';

interface TranscriptCardProps {
  transcript: ITranscript;
  onDelete: (id: string) => void;
}

export const TranscriptCard = ({ transcript, onDelete }: TranscriptCardProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showTranslated, setShowTranslated] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const duration = dayjs.duration(transcript.duration, 'seconds').format('m:ss');
  const date = dayjs(transcript.createdAt).fromNow();

  useEffect(() => {
    return () => {
      clearTimeout(copyTimerRef.current);
      clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const hasTranslation = !!transcript.translatedText;
  const displayText = hasTranslation && showTranslated
    ? transcript.translatedText!
    : transcript.text;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayText);
    } catch (err) {
      console.warn('[Transcript] Copy failed:', err instanceof Error ? err.message : err);
      return;
    }
    setCopied(true);
    toast.success(t('transcript.copied'));
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  // Re-enables the buttons if the delete request fails and the card stays in the list.
  const handleConfirmDelete = () => {
    setDeleting(true);
    setConfirmingDelete(false);
    onDelete(transcript.id);
    deleteTimerRef.current = setTimeout(() => setDeleting(false), 3000);
  };

  return (
    <Card
      variant="bordered"
      role="button"
      tabIndex={0}
      aria-label={t('common.copy')}
      onClick={handleCopy}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCopy();
        }
      }}
      className="cursor-pointer group border-solid border-[#e5e5e5] hover:border-[#171717] transition-colors"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[#171717] text-sm leading-relaxed flex-1 min-w-0 whitespace-pre-wrap break-words">{displayText}</p>
          <span className="text-[#737373] group-hover:text-[#171717] transition-colors flex-shrink-0 mt-0.5">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 text-[#737373] text-xs">
            <span>{date}</span>
            <span>·</span>
            <span>{duration}</span>
            {hasTranslation ? (
              <div className="flex items-center border border-[#e5e5e5] rounded-md overflow-hidden">
                <button
                  aria-pressed={!showTranslated}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTranslated(false);
                  }}
                  className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                    !showTranslated
                      ? 'bg-[#171717] text-white'
                      : 'bg-transparent text-[#737373]'
                  }`}
                >
                  {t('transcript.original')}
                </button>
                <button
                  aria-pressed={showTranslated}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTranslated(true);
                  }}
                  className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                    showTranslated
                      ? 'bg-[#171717] text-white'
                      : 'bg-transparent text-[#737373]'
                  }`}
                >
                  {t('transcript.ai')}
                </button>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs uppercase">
                {transcript.language}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {transcript.tokenUsage && (
              <span className="font-mono text-[10px] text-[#a3a3a3]">
                {transcript.tokenUsage.inputTokens}in · {transcript.tokenUsage.outputTokens}out · {transcript.tokenUsage.cacheReadTokens}cached
              </span>
            )}
            {confirmingDelete ? (
              <div className="flex items-center gap-2 text-xs font-medium">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmingDelete(false);
                  }}
                  className="text-[#737373] hover:text-[#171717] transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmDelete();
                  }}
                  className="text-red-600 hover:text-red-700 transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmingDelete(true);
                }}
                disabled={deleting}
                aria-label={t('common.delete')}
                title={t('common.delete')}
                className="text-[#737373] hover:text-red-600 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
