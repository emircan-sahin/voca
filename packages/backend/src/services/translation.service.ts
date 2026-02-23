import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { env } from '~/config/env';

const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });

const BASE_PROMPT = `You are a translation engine inside a voice transcription app.

<input_context>
The text you receive is raw output from a speech-to-text engine. It may contain:
- Misheard words or phonetic approximations
- Missing punctuation or incorrect capitalization
- Filler words or incomplete sentences
</input_context>

<output_rules>
- Return ONLY the translated text, nothing else. No preamble, no explanation, no quotes.
- Preserve the original paragraph structure and line breaks.
- Fix punctuation and capitalization issues from the STT output.
- If a word is clearly misheard, infer the correct word from context and translate accordingly.
</output_rules>`;

const DEVELOPER_PROMPT = `${BASE_PROMPT}

<developer_context>
The user is a software developer. The speech often contains technical terminology.

Responsibilities:
- Recognize and correct misheard technical terms (e.g. "nahbar" → "navbar", "reakt" → "React", "neks" → "Next.js", "endpoynt" → "endpoint", "dipendansi" → "dependency").
- Keep well-known technical terms in their original English form even when translating to another language, as developers use them that way (e.g. "component", "state", "props", "middleware", "API", "hook", "deploy", "commit", "merge", "branch", "pull request").
- Translate conversational parts naturally while preserving technical accuracy.
</developer_context>`;

export interface TranslationResult {
  translatedText: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
  };
}

export const translateText = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  tone: 'developer' | 'personal' = 'developer',
  options?: { numeric?: boolean; planning?: boolean }
): Promise<TranslationResult> => {
  let system = tone === 'developer' ? DEVELOPER_PROMPT : BASE_PROMPT;

  if (options?.numeric) {
    system += `\n\n<numeric_rules>
IMPORTANT: You MUST convert ALL numbers expressed as words into their numeric digit form in the final output.
This applies to numbers in ANY language (source or target).
Examples:
- "iki nokta beş" → "2.5"
- "yüz elli" → "150"
- "üç bin" → "3000"
- "two hundred" → "200"
- "on iki" → "12"
- "sıfır nokta yedi beş" → "0.75"
Never leave a number in word form — always use digits.
</numeric_rules>`;
  }

  if (options?.planning) {
    system += `\n\n<planning_rules>
When the speaker dictates TWO OR MORE sequential items (e.g. "birincisi …, ikincisi …", "first …, second …"), format them as a numbered list with each item on its own line:
1. First item
2. Second item
Keep the numbering sequential. Each item MUST start on a new line.
If there is only ONE item (e.g. "1. looks good"), do NOT format it as a list — treat it as regular text.
</planning_rules>`;
  }

  const { text: translatedText, usage } = await generateText({
    model: google('gemini-2.0-flash'),
    system,
    prompt: `Translate the following text from ${sourceLang} to ${targetLang}:\n\n${text}`,
  });

  const flags = [
    options?.numeric && 'numeric',
    options?.planning && 'planning',
  ].filter(Boolean);

  console.log(
    `[Translation] ${sourceLang} → ${targetLang} (${tone}${flags.length ? `, ${flags.join(', ')}` : ''}) | in:${usage.inputTokens} out:${usage.outputTokens} cached:${(usage as any).inputTokenDetails?.cacheReadTokens ?? 0}`
  );

  return {
    translatedText,
    tokenUsage: {
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      cacheReadTokens: (usage as any).inputTokenDetails?.cacheReadTokens ?? 0,
    },
  };
};
