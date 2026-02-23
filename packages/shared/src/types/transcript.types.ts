export interface ITokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

export interface ITranscript {
  id: string;
  text: string;
  duration: number;   // seconds
  language: string;
  createdAt: string;  // ISO 8601
  translatedText?: string;
  targetLanguage?: string;
  tokenUsage?: ITokenUsage;
}
