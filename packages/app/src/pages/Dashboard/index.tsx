import { ITranscript } from '@voca/shared';
import { RecordButton } from '~/components/RecordButton';
import { TranscriptCard } from '~/components/TranscriptCard';

interface DashboardViewProps {
  isRecording: boolean;
  isProcessing: boolean;
  onToggle: () => void;
  transcripts: ITranscript[];
  onDelete: (id: string) => void;
}

export const DashboardView = ({
  isRecording,
  isProcessing,
  onToggle,
  transcripts,
  onDelete,
}: DashboardViewProps) => {
  const recentTranscripts = transcripts.slice(0, 3);

  return (
    <div className="p-6 space-y-8">
      {/* Record Section */}
      <div className="flex flex-col items-center gap-4">
        <RecordButton isRecording={isRecording} isProcessing={isProcessing} onClick={onToggle} />
        <p className="text-[#737373] text-sm">
          {isProcessing
            ? 'Processing...'
            : isRecording
            ? 'Click to stop recording'
            : 'Click to start recording'}
        </p>
      </div>

      {/* Recent Transcripts */}
      {recentTranscripts.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-[#171717] mb-3">Recent Transcripts</h3>
          <div className="flex flex-col gap-3">
            {recentTranscripts.map((t) => (
              <TranscriptCard key={t.id} transcript={t} onDelete={onDelete} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
