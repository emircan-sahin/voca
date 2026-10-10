// English tech terms people drop into non-English speech ("bunu high effort ile deploy et").
// Monolingual models (e.g. language=tr) mis-hear them unless biased toward them.
// Deepgram recommends 20–50 keyterms; keep the list short.
export const ENGLISH_TECH_TERMS = [
  'high', 'medium', 'low', 'effort',
  'deploy', 'commit', 'push', 'pull request', 'merge', 'branch', 'rebase',
  'build', 'debug', 'bug', 'fix', 'refactor', 'review', 'release', 'feature',
  'frontend', 'backend', 'API', 'endpoint', 'database', 'cache', 'token',
  'prompt', 'model', 'agent', 'production', 'staging', 'test',
];

// Whisper prompt is capped at 224 tokens, Deepgram recommends keyterms stay under ~500.
// No tokenizer here, so estimate high: non-ASCII chars (accents, CJK, Cyrillic) cost ~2 tokens each.
const estimateTokens = (s: string) => {
  let ascii = 0;
  let other = 0;
  for (const ch of s) ch.charCodeAt(0) < 128 ? ascii++ : other++;
  return Math.ceil(ascii / 3 + other * 2);
};

export const WHISPER_PROMPT_TOKEN_BUDGET = 200;
export const DEEPGRAM_KEYTERM_TOKEN_BUDGET = 450;
export const DEEPGRAM_KEYTERM_MAX_COUNT = 80;

// User words come first so a cap drops built-in tech terms before the user's own words.
export const buildBiasTerms = (
  vocabulary: string[],
  language: string,
  limits: { maxTokens: number; maxCount?: number },
): string[] => {
  const seen = new Set<string>();
  const terms: string[] = [];
  let tokens = 0;

  for (const term of [...vocabulary, ...(language !== 'en' ? ENGLISH_TECH_TERMS : [])]) {
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    tokens += estimateTokens(`${term}, `);
    if (tokens > limits.maxTokens || terms.length >= (limits.maxCount ?? Infinity)) break;
    terms.push(term);
  }
  return terms;
};

// Same split as the transcript side of the Groq echo guard, so both sides tokenize identically.
export const toPromptWords = (terms: string[]): Set<string> =>
  new Set(terms.flatMap((t) => t.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean)));
