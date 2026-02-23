import { Switch, Label } from 'poyraz-ui/atoms';
import { useNoiseSuppressionStore } from '~/stores/noiseSuppression.store';

export const NoiseSuppression = () => {
  const { enabled, toggle } = useNoiseSuppressionStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="noise-suppression-toggle" className="text-sm cursor-pointer">
          Noise Suppression
        </Label>
        <Switch
          id="noise-suppression-toggle"
          checked={enabled}
          onCheckedChange={() => toggle()}
        />
      </div>

      <p className="text-xs text-[#737373] leading-relaxed">
        Reduces constant background noise like fans, air conditioning, or traffic.
        <br />
        Keep it off in quiet environments — it may slightly alter voice quality.
      </p>
    </div>
  );
};
