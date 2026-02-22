export interface ITranscript {
  id: string;
  text: string;
  duration: number;   // seconds
  language: string;
  createdAt: number;  // Unix ms (dayjs().valueOf())
}
