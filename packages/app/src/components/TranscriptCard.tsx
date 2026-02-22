import { useState } from 'react';
import { Trash2, Copy, Check } from 'lucide-react';
import { ITranscript } from '@voca/shared';
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
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={handleCopy}
      className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-gray-100 text-sm leading-relaxed flex-1">{transcript.text}</p>
        <span className="text-gray-500 group-hover:text-gray-300 transition-colors flex-shrink-0 mt-0.5">
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </span>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3 text-gray-400 text-xs">
          <span>{date}</span>
          <span className="text-gray-600">•</span>
          <span>{duration}</span>
          <span className="text-gray-600">•</span>
          <span className="uppercase">{transcript.language}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(transcript.id);
          }}
          className="text-gray-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
