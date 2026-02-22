import { Mic, Square, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface RecordButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onClick: () => void;
}

export const RecordButton = ({ isRecording, isProcessing, onClick }: RecordButtonProps) => {
  const disabled = isProcessing;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex items-center justify-center w-20 h-20 rounded-full transition-all duration-200 border-2 border-dashed',
        {
          'bg-red-500 border-red-400 animate-pulse': isRecording,
          'bg-red-600 hover:bg-red-700 border-red-400': !isRecording && !isProcessing,
          'bg-[#e5e5e5] border-[#e5e5e5] cursor-not-allowed': isProcessing,
        }
      )}
    >
      {isProcessing ? (
        <Loader2 className="w-8 h-8 text-[#737373] animate-spin" />
      ) : isRecording ? (
        <Square className="w-8 h-8 text-white" />
      ) : (
        <Mic className="w-8 h-8 text-white" />
      )}
    </button>
  );
};
