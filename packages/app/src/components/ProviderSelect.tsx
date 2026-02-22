import { Provider, useProviderStore } from '~/stores/provider.store';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from 'poyraz-ui/molecules';

const providers: { value: Provider; label: string; description: string }[] = [
  { value: 'deepgram', label: 'Deepgram Nova', description: 'nova-3' },
  { value: 'groq', label: 'Groq Whisper', description: 'whisper-large-v3-turbo' },
];

export const ProviderSelect = () => {
  const { provider, setProvider } = useProviderStore();

  return (
    <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
      <SelectTrigger className="w-auto text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {providers.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label} — {p.description}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
