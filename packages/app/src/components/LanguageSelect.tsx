import { ChevronDown } from 'lucide-react';
import { LANGUAGES, useLanguageStore } from '~/stores/language.store';

export const LanguageSelect = () => {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div className="relative inline-block">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="appearance-none bg-gray-800/80 text-sm text-gray-300 border border-gray-700/50 rounded-lg pl-3 pr-8 py-1.5 cursor-pointer hover:bg-gray-700/80 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-gray-600"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name} ({l.code})
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
      />
    </div>
  );
};
