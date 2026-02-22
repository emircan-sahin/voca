import { useState } from 'react';
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
  const [copied, setCopied] = useState(false);
  const duration = dayjs.duration(transcript.duration, 'seconds').format('m:ss');
  const date = dayjs(transcript.createdAt).format('DD MMM YYYY, HH:mm');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcript.text);
    setCopied(true);
    toast.success('Copied to clipboard');
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
          <p className="text-[#171717] text-sm leading-relaxed flex-1">{transcript.text}</p>
          <span className="text-[#737373] group-hover:text-[#171717] transition-colors flex-shrink-0 mt-0.5">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 text-[#737373] text-xs">
            <span>{date}</span>
            <span>·</span>
            <span>{duration}</span>
            <Badge variant="outline" className="text-xs uppercase">
              {transcript.language}
            </Badge>
          </div>
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
      </CardContent>
    </Card>
  );
};
