import { ChevronDown } from 'lucide-react';
import { Provider, useProviderStore } from '~/stores/provider.store';

const providers: { value: Provider; label: string; description: string }[] = [
  { value: 'deepgram', label: 'Deepgram Nova', description: 'nova-3' },
  { value: 'groq', label: 'Groq Whisper', description: 'whisper-large-v3-turbo' },
];

export const ProviderSelect = () => {
  const { provider, setProvider } = useProviderStore();
  const current = providers.find((p) => p.value === provider)!;

  return (
    <div className="relative inline-block">
      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value as Provider)}
        className="appearance-none bg-gray-800/80 text-sm text-gray-300 border border-gray-700/50 rounded-lg pl-3 pr-8 py-1.5 cursor-pointer hover:bg-gray-700/80 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-gray-600"
      >
        {providers.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label} — {p.description}
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
