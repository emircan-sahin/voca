import { describe, it, expect } from 'vitest';
import { vocabularySchema } from '@voca/shared';
import { buildBiasTerms, toPromptWords, ENGLISH_TECH_TERMS, WHISPER_PROMPT_TOKEN_BUDGET } from '~/config/stt';

const limits = { maxTokens: WHISPER_PROMPT_TOKEN_BUDGET };

describe('buildBiasTerms', () => {
  it('returns nothing for English without vocabulary', () => {
    expect(buildBiasTerms([], 'en', limits)).toEqual([]);
  });

  it('applies user words to English without tech terms', () => {
    expect(buildBiasTerms(['Kubernetes', 'Emircan'], 'en', limits)).toEqual(['Kubernetes', 'Emircan']);
  });

  it('puts user words before tech terms for non-English and de-dupes case-insensitively', () => {
    const terms = buildBiasTerms(['Deploy', 'Emircan'], 'tr', limits);
    expect(terms.slice(0, 2)).toEqual(['Deploy', 'Emircan']);
    expect(terms.filter((t) => t.toLowerCase() === 'deploy')).toHaveLength(1);
    expect(terms).toContain('API');
  });

  it('drops tech terms first when over budget, then trailing user words', () => {
    const user = Array.from({ length: 40 }, (_, i) => `userterm_long_${i}`);
    const terms = buildBiasTerms(user, 'tr', limits);
    expect(terms.slice(0, 5)).toEqual(user.slice(0, 5));
    expect(terms.some((t) => ENGLISH_TECH_TERMS.includes(t))).toBe(false);

    const big = Array.from({ length: 50 }, (_, i) => `${'x'.repeat(30)}${i}`);
    const capped = buildBiasTerms(big, 'en', limits);
    expect(capped.length).toBeLessThan(50);
    expect(capped).toEqual(big.slice(0, capped.length));
  });

  it('weighs non-ASCII text heavier and honours maxCount', () => {
    const ascii = buildBiasTerms(Array.from({ length: 20 }, (_, i) => `abcdef${i}`), 'en', { maxTokens: 40 });
    const cjk = buildBiasTerms(Array.from({ length: 20 }, (_, i) => `日本語${i}`), 'en', { maxTokens: 40 });
    expect(cjk.length).toBeLessThan(ascii.length);
    expect(buildBiasTerms(['a', 'b', 'c'], 'en', { maxTokens: 100, maxCount: 2 })).toEqual(['a', 'b']);
  });
});

describe('toPromptWords', () => {
  it('lowercases and splits phrases into letter-only words', () => {
    expect([...toPromptWords(['Pull Request', 'Emircan'])].sort()).toEqual(['emircan', 'pull', 'request']);
  });
});

describe('vocabularySchema', () => {
  it('trims entries and accepts commas in phrases', () => {
    expect(vocabularySchema.parse(['  Acme, Inc.  '])).toEqual(['Acme, Inc.']);
  });

  it('rejects empty, too long, control chars and too many entries', () => {
    expect(vocabularySchema.safeParse(['   ']).success).toBe(false);
    expect(vocabularySchema.safeParse(['x'.repeat(41)]).success).toBe(false);
    expect(vocabularySchema.safeParse(['a\nb']).success).toBe(false);
    expect(vocabularySchema.safeParse(Array.from({ length: 51 }, (_, i) => `w${i}`)).success).toBe(false);
  });
});
