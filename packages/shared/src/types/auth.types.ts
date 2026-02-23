export interface IUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'apple';
  createdAt: string;
}

export interface IAuthResponse {
  user: IUser;
  token: string;
  refreshToken: string;
}

export interface IUserSettings {
  provider: 'groq' | 'deepgram';
  language: string;
  translation: {
    enabled: boolean;
    targetLanguage: string;
    tone: 'developer' | 'personal';
    numeric: boolean;
    planning: boolean;
  };
}
