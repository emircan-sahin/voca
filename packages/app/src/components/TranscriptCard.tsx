import { Trash2 } from 'lucide-react';
import { ITranscript } from '@voca/shared';
import dayjs from '~/lib/dayjs';

interface TranscriptCardProps {
  transcript: ITranscript;
  onDelete: (id: string) => void;
}

export const TranscriptCard = ({ transcript, onDelete }: TranscriptCardProps) => {
  const duration = dayjs.duration(transcript.duration, 'seconds').format('m:ss');
  const date = dayjs(transcript.createdAt).format('DD MMM YYYY, HH:mm');

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <p className="text-gray-100 text-sm leading-relaxed">{transcript.text}</p>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3 text-gray-400 text-xs">
          <span>{date}</span>
          <span className="text-gray-600">•</span>
          <span>{duration}</span>
          <span className="text-gray-600">•</span>
          <span className="uppercase">{transcript.language}</span>
        </div>
        <button
          onClick={() => onDelete(transcript.id)}
          className="text-gray-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
