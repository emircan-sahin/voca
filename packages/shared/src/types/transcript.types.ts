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
  translationFailed?: boolean; // only on the create response, never persisted
}

// Server → client messages on the live dictation socket (client → server: LiveStart, binary audio, { type: 'stop' | 'cancel' })
export type LiveServerMessage =
  | { type: 'ready' }
  | { type: 'segment'; text: string }
  | { type: 'done'; message: string; transcript: ITranscript }
  | { type: 'error'; message: string; status: number };
