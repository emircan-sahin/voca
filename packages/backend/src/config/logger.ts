import { Axiom } from '@axiomhq/js';
import { env } from '~/config/env';

const axiom =
  env.AXIOM_TOKEN && env.AXIOM_DATASET
    ? new Axiom({ token: env.AXIOM_TOKEN })
    : null;

type Level = 'info' | 'warn' | 'error';

function send(level: Level, service: string, message: string, meta?: Record<string, unknown>, remote = true) {
  // Always log to console
  if (level === 'error') console.error(`[${service}] ${message}`);
  else if (level === 'warn') console.warn(`[${service}] ${message}`);
  else console.log(`[${service}] ${message}`);

  // Send to Axiom only if remote=true and configured
  if (remote && axiom) {
    axiom.ingest(env.AXIOM_DATASET, [{ level, service, message, ...meta }]);
  }
}

export const logger = {
  /** Logs to both console and Axiom */
  info: (service: string, message: string, meta?: Record<string, unknown>) =>
    send('info', service, message, meta),
  warn: (service: string, message: string, meta?: Record<string, unknown>) =>
    send('warn', service, message, meta),
  error: (service: string, message: string, meta?: Record<string, unknown>) =>
    send('error', service, message, meta),
  /** Logs to console only (startup, shutdown, etc.) */
  local: (service: string, message: string) =>
    send('info', service, message, undefined, false),
  flush: () => axiom?.flush(),
};
