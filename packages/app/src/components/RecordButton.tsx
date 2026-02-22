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
        'flex items-center justify-center w-20 h-20 rounded-full transition-all duration-200 shadow-lg',
        {
          'bg-red-500 hover:bg-red-600 animate-pulse': isRecording,
          'bg-indigo-600 hover:bg-indigo-700': !isRecording && !isProcessing,
          'bg-gray-600 cursor-not-allowed': isProcessing,
        }
      )}
    >
      {isProcessing ? (
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      ) : isRecording ? (
        <Square className="w-8 h-8 text-white" />
      ) : (
        <Mic className="w-8 h-8 text-white" />
      )}
    </button>
  );
};
