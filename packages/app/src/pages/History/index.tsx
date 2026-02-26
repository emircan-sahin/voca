import { useTranslation } from 'react-i18next';
import { ITranscript } from '@voca/shared';
import { Badge } from 'poyraz-ui/atoms';
import { TranscriptCard } from '~/components/TranscriptCard';

interface HistoryViewProps {
  transcripts: ITranscript[];
  onDelete: (id: string) => void;
}

export const HistoryView = ({ transcripts, onDelete }: HistoryViewProps) => {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-medium text-[#171717]">{t('history.allTranscripts')}</h3>
        <Badge variant="secondary">{transcripts.length}</Badge>
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
    </div>
  );
};
