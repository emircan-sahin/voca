import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Card, CardContent, Button, Input } from 'poyraz-ui/atoms';
import { VOCABULARY_MAX_ENTRIES, VOCABULARY_MAX_LENGTH } from '@voca/shared';
import { useVocabularyStore } from '~/stores/vocabulary.store';

export const VocabularySettings = () => {
  const { t } = useTranslation();
  const { words, add, remove } = useVocabularyStore();
  const [draft, setDraft] = useState('');
  const full = words.length >= VOCABULARY_MAX_ENTRIES;

  const handleAdd = () => {
    if (!draft.trim()) return;
    add(draft);
    setDraft('');
  };

  return (
    <Card variant="bordered" className="border-solid border-[#e5e5e5]">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[#171717]">{t('settings.vocabulary')}</h3>
          <span className="text-xs text-[#737373]">{words.length}/{VOCABULARY_MAX_ENTRIES}</span>
        </div>
        <p className="text-xs leading-relaxed text-[#737373]">{t('settings.vocabularyDesc')}</p>

        <div className="flex items-center gap-2">
          <Input
            value={draft}
            maxLength={VOCABULARY_MAX_LENGTH}
            disabled={full}
            placeholder={t('settings.vocabularyPlaceholder')}
            className="w-64"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button variant="outline" size="sm" onClick={handleAdd} disabled={full || !draft.trim()}>
            {t('settings.vocabularyAdd')}
          </Button>
        </div>

        {words.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {words.map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1 rounded-md border border-[#e5e5e5] bg-[#fafafa] pl-2 pr-1 py-0.5 text-xs text-[#171717]"
              >
                {word}
                <button
                  type="button"
                  aria-label={t('settings.vocabularyRemove', { word })}
                  onClick={() => remove(word)}
                  className="rounded p-0.5 text-[#737373] hover:text-[#171717]"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
