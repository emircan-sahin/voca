import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { env } from '~/config/env';

export const paddle = new Paddle(env.PADDLE_API_KEY, {
  environment: env.PADDLE_SANDBOX ? Environment.sandbox : Environment.production,
});
