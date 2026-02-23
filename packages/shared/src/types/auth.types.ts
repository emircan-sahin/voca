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
