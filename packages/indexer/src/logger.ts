import pino from 'pino';

export function createLogger(level = 'info'): pino.Logger {
  return pino({
    level,
    base: { pkg: '@skillforge/indexer' },
    // Pretty in dev; JSON in prod (controlled by NODE_ENV or env override).
    ...(process.env.NODE_ENV !== 'production' && {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss' },
      },
    }),
  });
}
