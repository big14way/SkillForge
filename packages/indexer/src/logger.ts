import pino from 'pino';

/**
 * Indexer logger. Defaults to plain JSON so we don't depend on `pino-pretty`
 * being installed. Opt in to pretty output with `LOG_PRETTY=1`.
 */
export function createLogger(level = 'info'): pino.Logger {
  const wantPretty = process.env.LOG_PRETTY === '1';
  return pino({
    level,
    base: { pkg: '@skillforge/indexer' },
    ...(wantPretty && {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss' },
      },
    }),
  });
}
