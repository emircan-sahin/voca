import { useState } from 'react';
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
  const duration = dayjs.duration(transcript.duration, 'seconds').format('m:ss');
  const date = dayjs(transcript.createdAt).fromNow();

  const hasTranslation = !!transcript.translatedText;
  const displayText = hasTranslation && showTranslated
    ? transcript.translatedText!
    : transcript.text;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayText);
    setCopied(true);
    toast.success(t('transcript.copied'));
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card
      variant="bordered"
      onClick={handleCopy}
      className="cursor-pointer group border-solid border-[#e5e5e5] hover:border-[#171717] transition-colors"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[#171717] text-sm leading-relaxed flex-1">{displayText}</p>
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(transcript.id);
              }}
              className="text-[#737373] hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
